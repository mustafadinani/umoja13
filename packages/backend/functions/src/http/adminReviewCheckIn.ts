import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type CheckIn } from "@umoja/shared";
import { db } from "../util/admin.js";
import { nextPassId } from "../util/counters.js";
import { syncRosterCheckInStatus } from "../util/roster.js";

interface AdminReviewCheckInRequest {
  checkInId: string;
  decision: "approve" | "reject" | "nullify" | "restore";
}

/**
 * Admin/commissioner manual decision on a check-in — covers the AI-escalated
 * "admin_review" queue as well as post-hoc nullify/restore (random re-checks).
 * Routed through a function (not a direct client write) so pass-id assignment
 * stays behind the same atomic counter verifyCheckIn uses.
 */
export const adminReviewCheckIn = onCall<AdminReviewCheckInRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = callerSnap.data()?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can review check-ins.");
  }

  const { checkInId, decision } = request.data;
  const ref = db.collection(COLLECTIONS.checkIns).doc(checkInId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Check-in not found.");
  const checkIn = snap.data() as CheckIn;

  const now = Date.now();

  if (decision === "approve") {
    const passId = await nextPassId();
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({
      checkInId: checkIn.id,
      userId: checkIn.userId,
      teamId: checkIn.teamId,
      categoryId: checkIn.categoryId,
      status: "approved",
      passId,
      qrPayload: `UMOJA:${passId}:${checkIn.userId}:${checkIn.categoryId}`,
      selfieUrl: checkIn.selfieUrl,
    });
    await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, "approved", checkIn.selfieUrl);
  } else if (decision === "reject") {
    await ref.set({ status: "rejected", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, "rejected");
  } else if (decision === "nullify") {
    await ref.set({ status: "rejected", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({ status: "rejected" }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, "rejected");
  } else if (decision === "restore") {
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({ status: "approved" }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, "approved", checkIn.selfieUrl);
  }

  return { status: decision };
});
