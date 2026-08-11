import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, CATEGORIES, type CheckIn, type Team } from "@umoja/shared";
import { db } from "../util/admin.js";
import { nextPassId } from "../util/counters.js";
import { syncRosterCheckInStatus } from "../util/roster.js";
import { sendEmail, EMAIL_SECRETS } from "../services/emailjs.service.js";
import { checkInDecisionEmail } from "../util/emailTemplates.js";

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
export const adminReviewCheckIn = onCall<AdminReviewCheckInRequest>({ secrets: EMAIL_SECRETS }, async (request) => {
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

  await sendCheckInDecisionEmail(checkIn, decision === "approve" || decision === "restore");

  return { status: decision };
});

async function sendCheckInDecisionEmail(checkIn: CheckIn, approved: boolean): Promise<void> {
  try {
    const [userSnap, teamSnap] = await Promise.all([
      db.collection(COLLECTIONS.users).doc(checkIn.userId).get(),
      db.collection(COLLECTIONS.teams).doc(checkIn.teamId).get(),
    ]);
    const email: string | undefined = userSnap.data()?.email;
    const name: string = userSnap.data()?.displayName ?? "there";
    if (!email) return;

    const team = teamSnap.data() as Team | undefined;
    const categoryLabel = CATEGORIES.find((c) => c.id === checkIn.categoryId)?.label ?? checkIn.categoryId;

    const { subject, html } = checkInDecisionEmail({
      name,
      categoryLabel,
      teamName: team?.name,
      approved,
      rejectionReason: checkIn.aiVerification?.reasoning,
    });
    await sendEmail(email, subject, html);
  } catch (err) {
    console.error("adminReviewCheckIn: failed to send decision email:", err);
  }
}
