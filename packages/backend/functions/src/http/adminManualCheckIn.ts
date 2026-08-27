import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  CHECKIN_CONSENT_POLICY_VERSION,
  checkInIdFor,
  COLLECTIONS,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  type CheckIn,
  type RegisteredPlayer,
} from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";
import { nextPassId } from "../util/counters.js";
import { syncRosterCheckInStatus } from "../util/roster.js";
import { sendCheckInDecisionEmail } from "./adminReviewCheckIn.js";

interface AdminManualCheckInRequest {
  teamId: string;
  /** Per-child identifier — see RosterEntry.playerKey. Never the caller's bare account uid. */
  playerKey: string;
  categoryId: string;
}

/**
 * Staff-only: directly approves a player's check-in for this team+category
 * without them ever submitting a selfie/ID themselves — for exactly the
 * "outstanding" cases where the normal flow couldn't complete (camera
 * blocked, an account-side bug like a stale playerOf, someone who's right
 * there at the gate but never got the app to work) but staff can confirm
 * who they are in person. Produces the same end state adminReviewCheckIn's
 * "approve" does (same tournamentPasses doc, same rosterCheckIns sync, same
 * decision email) so nothing downstream has to know the difference — except
 * the CheckIn doc itself is flagged `manualOverride: true`, so anyone
 * reviewing it later can see no photo/ID was actually captured.
 *
 * If this player already has a real checkIn doc (pending/declined), this
 * still works — it just approves it in place, same as the existing APPROVE
 * button, and preserves whatever selfie/ID they did submit.
 */
export const adminManualCheckIn = onCall<AdminManualCheckInRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = callerSnap.data()?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can manually verify a check-in.");
  }

  const { teamId, playerKey, categoryId } = request.data;
  if (!teamId || !playerKey || !categoryId) {
    throw new HttpsError("invalid-argument", "teamId, playerKey, and categoryId are required.");
  }

  // Looked up server-side rather than trusting a client-supplied uid — same
  // pattern setJerseyNumber uses to resolve which account this playerKey
  // belongs to.
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
  const player = playerDoc?.data() as RegisteredPlayer | undefined;
  if (!player) throw new HttpsError("not-found", "Couldn't find this player's registration on this team.");
  if (!player.uid?.trim()) {
    throw new HttpsError("failed-precondition", "This player has no linked account to check in.");
  }

  const id = checkInIdFor(playerKey, teamId, categoryId);
  const ref = db.collection(COLLECTIONS.checkIns).doc(id);
  const existingSnap = await ref.get();
  const existing = existingSnap.exists ? (existingSnap.data() as CheckIn) : undefined;
  const now = Date.now();

  const checkIn: CheckIn = {
    id,
    userId: player.uid.trim(),
    playerKey,
    teamId,
    categoryId,
    status: "approved",
    selfieUrl: existing?.selfieUrl ?? "",
    govIdUrl: existing?.govIdUrl ?? "",
    submittedAt: existing?.submittedAt ?? now,
    attempt: existing?.attempt ?? 1,
    reviewedBy: uid,
    reviewedAt: now,
    manualOverride: existing?.selfieUrl ? (existing.manualOverride ?? false) : true,
    consent: existing?.consent ?? { acceptedBy: "self", guardianName: null, acceptedAt: now, policyVersion: CHECKIN_CONSENT_POLICY_VERSION },
    ...(existing?.lineOfWork ? { lineOfWork: existing.lineOfWork } : {}),
    ...(existing?.currentEmployer ? { currentEmployer: existing.currentEmployer } : {}),
  };
  await ref.set(checkIn, { merge: true });

  const passId = await nextPassId();
  await db.collection(COLLECTIONS.tournamentPasses).doc(id).set({
    checkInId: id,
    userId: checkIn.userId,
    playerKey,
    teamId,
    categoryId,
    status: "approved",
    passId,
    qrPayload: `UMOJA:${passId}:${playerKey}:${categoryId}`,
    ...(checkIn.selfieUrl ? { selfieUrl: checkIn.selfieUrl } : {}),
  }, { merge: true });

  await syncRosterCheckInStatus(teamId, playerKey, categoryId, "approved", checkIn.selfieUrl || undefined);
  await sendCheckInDecisionEmail(checkIn, true);

  return { status: "approved" as const };
});
