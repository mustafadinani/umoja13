import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, pickPrimaryRole, type Role, type UserProfile, type VolunteerApplication } from "@umoja/shared";
import { auth, db } from "../util/admin.js";
import { ensureInGeneralPod } from "../util/generalPod.js";
import { buildBaseProfileFromOutreach } from "../util/outreachProfile.js";

interface ReviewVolunteerApplicationRequest {
  applicationId: string;
  decision: "approve" | "reject";
}

/**
 * Admin/commissioner-only: approves or rejects a "Become a Volunteer"
 * application. Approval grants the 'volunteer' role (custom claims +
 * Firestore users/{uid}.roles) the same way setUserRole does — this is the
 * only path a non-admin/commissioner can end up with the volunteer role.
 */
export const reviewVolunteerApplication = onCall<ReviewVolunteerApplicationRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can review volunteer applications.");
  }

  const { applicationId, decision } = request.data;
  const ref = db.collection(COLLECTIONS.volunteerApplications).doc(applicationId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Application not found.");
  const application = snap.data() as VolunteerApplication;

  const now = Date.now();

  if (decision === "approve") {
    const targetUid = application.filedByUid;
    const targetSnap = await db.collection(COLLECTIONS.users).doc(targetUid).get();
    const targetRoles: Role[] = targetSnap.data()?.roles ?? [];

    // Whoever files a "Become a Volunteer" application is very often a real
    // Outreach-registered person (check-in flow links straight to this) whose
    // canonical profile lives at (default)/profiles/{uid}, not a umoja13-app
    // users doc — useResolvedProfile treats ANY users doc as authoritative
    // over that richer profile the instant one exists. If we're about to
    // create the doc for the first time, seed it from their real Outreach
    // data instead of a bare {roles} stub, or approving this application
    // would silently blank their real name/photo/family/team memberships.
    // A first-time volunteer with no Outreach match at all is a normal case
    // (e.g. staff/referee-only accounts) — buildBaseProfileFromOutreach falls
    // back to {} rather than throwing and aborting the whole approval.
    const baseProfile: Partial<UserProfile> = targetSnap.exists ? {} : await buildBaseProfileFromOutreach(targetUid);

    // Union of whatever roles the account already had, whatever Outreach
    // says it should have (e.g. "player", only known once baseProfile is
    // computed above), and "volunteer" for this approval. The previous
    // version computed newRoles from targetRoles ALONE, before baseProfile
    // was known — for anyone approved on their very first-ever visit to
    // this app (no users/{uid} doc yet), targetRoles was always `[]`, so a
    // real registered player got only `["volunteer"]` written, silently
    // dropping "player" and every dashboard/check-in tab that comes with
    // it. primaryRole is then always the highest-priority role present
    // (see PRIMARY_ROLE_PRIORITY) rather than a one-off "unless they were
    // already 'fan'" special case, so playing (or any staff role) never
    // gets bumped by volunteering — layering "volunteer" on top of an
    // existing role can no longer replace it.
    const newRoles = Array.from(new Set<Role>([...targetRoles, ...(baseProfile.roles ?? []), "volunteer"]));
    const newPrimaryRole = pickPrimaryRole(newRoles);

    await auth.setCustomUserClaims(targetUid, { roles: newRoles });

    await db.collection(COLLECTIONS.users).doc(targetUid).set(
      {
        ...baseProfile,
        roles: newRoles,
        primaryRole: newPrimaryRole,
        updatedAt: now,
      },
      { merge: true }
    );
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now }, { merge: true });
    await ensureInGeneralPod(targetUid);
    return { status: "approved" };
  }

  await ref.set({ status: "rejected", reviewedBy: uid, reviewedAt: now }, { merge: true });
  return { status: "rejected" };
});
