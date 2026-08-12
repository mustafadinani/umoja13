import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  CATEGORIES,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  type CheckIn,
  type RegisteredPlayer,
  type Team,
  type TeamChannelMessage,
} from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";
import { nextPassId } from "../util/counters.js";
import { syncRosterCheckInStatus } from "../util/roster.js";
import { notifyUsers } from "../util/notify.js";
import { resolveAuthorName } from "../util/authorName.js";
import { sendEmail, EMAIL_SECRETS } from "../services/emailjs.service.js";
import { checkInDecisionEmail } from "../util/emailTemplates.js";

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
export const adminReviewCheckIn = onCall<AdminReviewCheckInRequest>({ secrets: EMAIL_SECRETS }, async (request) => {
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

  // Threaded through to sendCheckInDecisionEmail below — `checkIn` itself was
  // read before this decision's write, so it can't be trusted to carry the
  // reason this specific call is setting.
  let emailRejectionReason: string | undefined;

  if (decision === "approve") {
    const passId = await nextPassId();
    // Clear any reason left over from a prior reject-then-resubmit cycle on
    // this same doc — otherwise an approved check-in could still carry a
    // stale decline reason from before.
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now, updatedAt: now, rejectionReason: FieldValue.delete() }, { merge: true });
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
    // The reason used to only reach the player via the one-time notification
    // below, then vanish — the persisted CheckIn doc never recorded it, so
    // the player's dashboard always showed a bare "Declined" with nothing to
    // go on once that notification was dismissed or missed. Persist it here
    // too (FieldValue.delete() when blank, so a reasonless decline doesn't
    // leave a stale reason from a PRIOR rejected attempt on the same doc).
    const trimmedReason = reason?.trim();
    await ref.set(
      {
        status: "rejected",
        reviewedBy: uid,
        reviewedAt: now,
        updatedAt: now,
        rejectionReason: trimmedReason || FieldValue.delete(),
      },
      { merge: true }
    );
    await syncRosterCheckInStatus(checkIn.teamId, playerKey, checkIn.categoryId, "rejected");
    // Also notify (in-app + push) with the same reason, so a player who's
    // actively watching gets an immediate nudge, not just a dashboard update.
    await notifyUsers(
      [checkIn.userId],
      "Check-in declined",
      trimmedReason
        ? `Your check-in was declined: ${trimmedReason}. Please review and resubmit in the app.`
        : "Your check-in was declined. Please review and resubmit in the app."
    );
    await postDeclineToTeamChannel(checkIn.teamId, playerKey, uid, callerSnap.data()?.displayName);
    emailRejectionReason = trimmedReason;
  } else if (decision === "nullify") {
    // Not a decline the player did anything wrong to earn — a spot re-check
    // an admin triggered — so it gets its own fixed, non-blaming reason
    // rather than reusing "reject"'s free-text prompt.
    const nullifyReason = "Flagged for a routine re-check by an admin. Please check in again.";
    await ref.set(
      {
        status: "rejected",
        reviewedBy: uid,
        reviewedAt: now,
        updatedAt: now,
        rejectionReason: nullifyReason,
      },
      { merge: true }
    );
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({ status: "rejected" }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, playerKey, checkIn.categoryId, "rejected");
    emailRejectionReason = nullifyReason;
  } else if (decision === "restore") {
    await ref.set({ status: "approved", reviewedBy: uid, reviewedAt: now, updatedAt: now, rejectionReason: FieldValue.delete() }, { merge: true });
    await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({ status: "approved" }, { merge: true });
    await syncRosterCheckInStatus(checkIn.teamId, playerKey, checkIn.categoryId, "approved", checkIn.selfieUrl);
  }

  await sendCheckInDecisionEmail(checkIn, decision === "approve" || decision === "restore", emailRejectionReason);

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

async function sendCheckInDecisionEmail(checkIn: CheckIn, approved: boolean, rejectionReason?: string): Promise<void> {
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
      rejectionReason,
    });
    await sendEmail(email, subject, html);
  } catch (err) {
    console.error("adminReviewCheckIn: failed to send decision email:", err);
  }
}
