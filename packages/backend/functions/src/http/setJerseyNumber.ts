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
import { getCurrentTeamPlayerKeys } from "../util/roster.js";

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
 * the player setting their own (optional, offered during check-in), their
 * team's real registration captain, or an admin-designated coach/manager
 * (Team.coachManagerUids — see assignTeamOfficial; unlike the captain, they
 * aren't necessarily a registered player on the team themselves). Jersey
 * numbers are completely locked the moment the tournament starts
 * (TOURNAMENT_START_AT) — no sets, no changes, for anyone, whether or not
 * one was ever entered. The captain/manager is expected to input and lock
 * in every number before then; check-in itself stops offering the
 * jersey-number question once that date passes.
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
    // Not staff — this team's real captain, an admin-designated
    // coach/manager (acting on a teammate's behalf either way), or the
    // account this specific playerKey belongs to. playerKey never equals
    // the caller's own uid (it's the Outreach profileId of one specific
    // child, shared-uid families included), so this can no longer be a
    // simple `uid === playerKey` check — it has to actually look up whose
    // registration row this is.
    const teamSnap = await defaultDb
      .collection(REGISTRATION_ROOT)
      .doc(REGISTRATION_YEAR)
      .collection(TEAMS_REGISTERED)
      .doc(teamId)
      .get();
    const team = teamSnap.data() as RegisteredTeam | undefined;
    const isCaptain = !!team && (team.captainProfileId === uid || team.uid === uid);

    let authorized = isCaptain;

    if (!authorized) {
      const appTeamSnap = await db.collection(COLLECTIONS.teams).doc(teamId).get();
      const coachManagerUids: string[] = appTeamSnap.data()?.coachManagerUids ?? [];
      authorized = coachManagerUids.includes(uid);
    }

    if (!authorized) {
      const playersSnap = await defaultDb
        .collection(REGISTRATION_ROOT)
        .doc(REGISTRATION_YEAR)
        .collection(PLAYERS_REGISTERED)
        .where("teamId", "==", teamId)
        .where("uid", "==", uid)
        .get();
      authorized = playersSnap.docs.some((d) => {
        const p = d.data() as RegisteredPlayer;
        return (p.profileId?.trim() || d.id) === playerKey;
      });
    }

    if (!authorized) {
      throw new HttpsError("permission-denied", "Only this player, their team's captain/manager, or staff can set this.");
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
    const otherClaims = dupeSnap.docs.filter((d) => d.data().userId !== playerKey);
    if (otherClaims.length > 0) {
      // rosterCheckIns is append-only and keyed by playerKey — a claim left
      // over from a playerKey that's no longer on the current roster (a
      // registration correction, a re-submitted row) must not block a
      // number that's genuinely free today. Only a claim held by someone
      // actually on the roster right now counts as a real conflict.
      const currentPlayerKeys = await getCurrentTeamPlayerKeys(teamId, categoryId);
      const realDupe = otherClaims.find((d) => currentPlayerKeys.has(d.data().userId));
      if (realDupe) throw new HttpsError("already-exists", `#${jerseyNumber} is already taken on this team.`);
    }
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
