import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  TOURNAMENT_START_AT,
  rosterCheckInIdFor,
  type RegisteredPlayer,
  type RegisteredTeam,
  type UserProfile,
} from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";

interface SetJerseyNumberRequest {
  teamId: string;
  /** Per-child identifier — see RosterEntry.playerKey. Never the caller's bare account uid; two siblings on one account need two different values here. */
  playerKey: string;
  categoryId: string;
  /** null clears it (only meaningful before it's ever been set — see the lock below). */
  jerseyNumber: number | null;
}

/**
 * Sets a player's jersey number on their rosterCheckIns overlay doc — either
 * the player setting their own (optional, offered during check-in) or their
 * team's captain/manager setting it on their behalf. Jersey numbers are
 * completely locked the moment the tournament starts (TOURNAMENT_START_AT)
 * — no sets, no changes, for anyone, whether or not one was ever entered.
 * The captain/manager is expected to input and lock in every number before
 * then; check-in itself stops offering the jersey-number question once
 * that date passes.
 */
export const setJerseyNumber = onCall<SetJerseyNumberRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, playerKey, categoryId, jerseyNumber } = request.data;
  if (!teamId || !playerKey || !categoryId) {
    throw new HttpsError("invalid-argument", "teamId, playerKey, and categoryId are required.");
  }
  if (jerseyNumber !== null && (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 999)) {
    throw new HttpsError("invalid-argument", "jerseyNumber must be a whole number between 0 and 999, or null.");
  }

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerProfile = callerSnap.data() as UserProfile | undefined;
  const isStaffCaller = callerProfile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;

  if (!isStaffCaller) {
    // Not staff — either this team's captain/manager (acting on a
    // teammate's behalf), or the account this specific playerKey belongs
    // to. playerKey never equals the caller's own uid (it's the Outreach
    // profileId of one specific child, shared-uid families included), so
    // this can no longer be a simple `uid === playerKey` check — it has to
    // actually look up whose registration row this is.
    const teamSnap = await defaultDb
      .collection(REGISTRATION_ROOT)
      .doc(REGISTRATION_YEAR)
      .collection(TEAMS_REGISTERED)
      .doc(teamId)
      .get();
    const team = teamSnap.data() as RegisteredTeam | undefined;
    const isCaptain = !!team && (team.captainProfileId === uid || team.uid === uid);

    if (!isCaptain) {
      const playersSnap = await defaultDb
        .collection(REGISTRATION_ROOT)
        .doc(REGISTRATION_YEAR)
        .collection(PLAYERS_REGISTERED)
        .where("teamId", "==", teamId)
        .where("uid", "==", uid)
        .get();
      const ownsPlayerKey = playersSnap.docs.some((d) => {
        const p = d.data() as RegisteredPlayer;
        return (p.profileId?.trim() || d.id) === playerKey;
      });
      if (!ownsPlayerKey) {
        throw new HttpsError("permission-denied", "Only this player, their team's captain, or staff can set this.");
      }
    }
  }

  // Hard cutoff — nobody (player, captain, or staff through this same path) can
  // set or change a jersey number once the tournament has started, whether or
  // not one was ever entered. A genuine correction after that point should go
  // through direct Firestore access, not this callable.
  if (Date.now() >= TOURNAMENT_START_AT) {
    throw new HttpsError("failed-precondition", "Jersey numbers are locked now that the tournament has started.");
  }

  const id = rosterCheckInIdFor(teamId, playerKey, categoryId);
  const ref = db.collection(COLLECTIONS.rosterCheckIns).doc(id);

  if (jerseyNumber !== null) {
    const dupeSnap = await db
      .collection(COLLECTIONS.rosterCheckIns)
      .where("teamId", "==", teamId)
      .where("categoryId", "==", categoryId)
      .where("jerseyNumber", "==", jerseyNumber)
      .get();
    const dupe = dupeSnap.docs.find((d) => d.data().userId !== playerKey);
    if (dupe) throw new HttpsError("already-exists", `#${jerseyNumber} is already taken on this team.`);
  }

  await ref.set(
    {
      id,
      teamId,
      userId: playerKey,
      categoryId,
      jerseyNumber: jerseyNumber === null ? FieldValue.delete() : jerseyNumber,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { ok: true };
});
