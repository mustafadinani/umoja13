import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  COLLECTIONS,
  DATA_SOURCES,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  mapOutreachProfileToUserProfile,
  type OutreachProfile,
  type RegisteredPlayer,
  type UserProfile,
  type VolunteerApplication,
} from "@umoja/shared";
import { auth, db, defaultDb } from "../util/admin.js";
import { ensureInGeneralPod } from "../util/generalPod.js";

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
    const targetRoles: string[] = targetSnap.data()?.roles ?? [];
    const targetPrimaryRole: string = targetSnap.data()?.primaryRole ?? "fan";
    const newRoles = targetRoles.includes("volunteer") ? targetRoles : [...targetRoles, "volunteer"];
    // Only take over primaryRole for someone who hasn't picked a more
    // specific role yet (e.g. player/captain) — a volunteer who's also
    // a player keeps their player dashboard as primary.
    const newPrimaryRole = targetPrimaryRole === "fan" ? "volunteer" : targetPrimaryRole;

    await auth.setCustomUserClaims(targetUid, { roles: newRoles });

    // Whoever files a "Become a Volunteer" application is very often a real
    // Outreach-registered person (check-in flow links straight to this) whose
    // canonical profile lives at (default)/profiles/{uid}, not a umoja13-app
    // users doc — useResolvedProfile treats ANY users doc as authoritative
    // over that richer profile the instant one exists. If we're about to
    // create the doc for the first time, seed it from their real Outreach
    // data instead of a bare {roles} stub, or approving this application
    // would silently blank their real name/photo/family/team memberships.
    let baseProfile: Partial<UserProfile> = {};
    if (!targetSnap.exists) {
      const outreachSnap = await defaultDb.collection(DATA_SOURCES.registration.profilesCollection).doc(targetUid).get();
      if (outreachSnap.exists) {
        const playersSnap = await defaultDb
          .collection(REGISTRATION_ROOT)
          .doc(REGISTRATION_YEAR)
          .collection(PLAYERS_REGISTERED)
          .where("uid", "==", targetUid)
          .get();
        const players = playersSnap.docs.map((d) => ({ ...(d.data() as RegisteredPlayer), id: d.id }));
        baseProfile = mapOutreachProfileToUserProfile(targetUid, outreachSnap.data() as OutreachProfile, players);
      }
    }

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
