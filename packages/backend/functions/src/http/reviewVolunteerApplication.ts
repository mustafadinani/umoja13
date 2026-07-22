import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type VolunteerApplication } from "@umoja/shared";
import { auth, db } from "../util/admin.js";

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
    const targetSnap = await db.collection(COLLECTIONS.users).doc(application.filedByUid).get();
    const targetRoles: string[] = targetSnap.data()?.roles ?? [];
    const targetPrimaryRole: string = targetSnap.data()?.primaryRole ?? "fan";
    const newRoles = targetRoles.includes("volunteer") ? targetRoles : [...targetRoles, "volunteer"];

    await auth.setCustomUserClaims(application.filedByUid, { roles: newRoles });
    await db.collection(COLLECTIONS.users).doc(application.filedByUid).set(
      {
        roles: newRoles,
        // Only take over primaryRole for someone who hasn't picked a more
        // specific role yet (e.g. player/captain) — a volunteer who's also
        // a player keeps their player dashboard as primary.
        primaryRole: targetPrimaryRole === "fan" ? "volunteer" : targetPrimaryRole,
        updatedAt: now,
      },
      { merge: true }
    );
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now }, { merge: true });
    return { status: "approved" };
  }

  await ref.set({ status: "rejected", reviewedBy: uid, reviewedAt: now }, { merge: true });
  return { status: "rejected" };
});
