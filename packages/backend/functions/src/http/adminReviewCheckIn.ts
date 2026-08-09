import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  type CheckIn,
  type RegisteredPlayer,
  type TeamChannelMessage,
} from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";
import { nextPassId } from "../util/counters.js";
import { syncRosterCheckInStatus } from "../util/roster.js";
import { notifyUsers } from "../util/notify.js";
import { resolveAuthorName } from "../util/authorName.js";

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
    await postDeclineToTeamChannel(checkIn.teamId, playerKey, uid, callerSnap.data()?.displayName);
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

/**
 * Posts the required decline notice into the team's channel (same
 * `teamChannels/{teamId}` doc sendTeamMessage writes to) so the whole roster
 * sees it, not just the declined player's own notification. Player name
 * comes from the real registration data (`playersRegistered`), matching the
 * same playerKey-lookup pattern setJerseyNumber uses — the checkIns doc
 * itself never stores a display name.
 */
async function postDeclineToTeamChannel(teamId: string, playerKey: string, adminUid: string, adminDisplayName?: string): Promise<void> {
  const playersSnap = await defaultDb
    .collection(REGISTRATION_ROOT)
    .doc(REGISTRATION_YEAR)
    .collection(PLAYERS_REGISTERED)
    .where("teamId", "==", teamId)
    .get();

  const playerDoc = playersSnap.docs.find((d) => {
    const p = d.data() as RegisteredPlayer;
    return (p.profileId?.trim() || d.id) === playerKey;
  });
  const playerName = playerDoc
    ? `${(playerDoc.data() as RegisteredPlayer).firstName ?? ""} ${(playerDoc.data() as RegisteredPlayer).lastName ?? ""}`.trim() || "This player"
    : "This player";

  const message: TeamChannelMessage = {
    id: db.collection(COLLECTIONS.teamChannels).doc().id,
    from: "admin",
    authorUid: adminUid,
    authorName: await resolveAuthorName(adminUid, adminDisplayName),
    text: `Unfortunately, ${playerName}'s check-in was declined. Please kindly check-in again and address issues noted in the check-in.`,
    createdAt: Date.now(),
  };

  await db.collection(COLLECTIONS.teamChannels).doc(teamId).set(
    { teamId, updatedAt: Date.now(), messages: FieldValue.arrayUnion(message) },
    { merge: true }
  );

  const rosterUids = [...new Set(playersSnap.docs.map((d) => (d.data() as RegisteredPlayer).uid).filter((v): v is string => !!v))];
  if (rosterUids.length > 0) {
    await notifyUsers(rosterUids, "Team check-in update", message.text);
  }
}
