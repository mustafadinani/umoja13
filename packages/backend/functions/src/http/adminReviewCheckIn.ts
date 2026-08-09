import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type CheckIn } from "@umoja/shared";
import { db } from "../util/admin.js";
import { nextPassId } from "../util/counters.js";
import { syncRosterCheckInStatus } from "../util/roster.js";
import { notifyUsers } from "../util/notify.js";

interface AdminReviewCheckInRequest {
  checkInId: string;
  decision: "approve" | "reject" | "nullify" | "restore";
  /** Only meaningful for "reject" — shown to the player so they know what to fix before resubmitting. */
  reason?: string;
}

/**
 * Admin/commissioner manual decision on a check-in — the only way a check-in
 * ever gets approved/rejected, plus post-hoc nullify/restore (random
 * re-checks). Routed through a function (not a direct client write) so
 * pass-id assignment stays behind the same atomic counter every time.
 */
export const adminReviewCheckIn = onCall<AdminReviewCheckInRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = callerSnap.data()?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can review check-ins.");
  }

  const { checkInId, decision, reason } = request.data;
  const ref = db.collection(COLLECTIONS.checkIns).doc(checkInId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Check-in not found.");
  const checkIn = snap.data() as CheckIn;

  const now = Date.now();
  // Legacy check-ins written before playerKey existed fall back to userId,
  // matching their pre-fix behavior exactly.
  const playerKey = checkIn.playerKey ?? checkIn.userId;

  if (decision === "approve") {
    const passId = await nextPassId();
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({
      checkInId: checkIn.id,
      // userId stays the real account uid — TournamentPass's read rule
      // compares this to request.auth.uid.
      userId: checkIn.userId,
      playerKey,
      teamId: checkIn.teamId,
      categoryId: checkIn.categoryId,
      status: "approved",
      passId,
      qrPayload: `UMOJA:${passId}:${playerKey}:${checkIn.categoryId}`,
      selfieUrl: checkIn.selfieUrl,
    });
    await syncRosterCheckInStatus(checkIn.teamId, playerKey, checkIn.categoryId, "approved", checkIn.selfieUrl);
  } else if (decision === "reject") {
    await ref.set({ status: "rejected", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, playerKey, checkIn.categoryId, "rejected");
    // Rejecting silently left the player with no way to know their check-in
    // needed fixing — notify them (in-app + push) with whatever reason the
    // admin gave, so they know what to correct before resubmitting.
    const trimmedReason = reason?.trim();
    await notifyUsers(
      [checkIn.userId],
      "Check-in declined",
      trimmedReason
        ? `Your check-in was declined: ${trimmedReason}. Please review and resubmit in the app.`
        : "Your check-in was declined. Please review and resubmit in the app."
    );
  } else if (decision === "nullify") {
    await ref.set({ status: "rejected", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({ status: "rejected" }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, playerKey, checkIn.categoryId, "rejected");
  } else if (decision === "restore") {
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now, updatedAt: now }, { merge: true });
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({ status: "approved" }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, playerKey, checkIn.categoryId, "approved", checkIn.selfieUrl);
  }

  return { status: decision };
});
