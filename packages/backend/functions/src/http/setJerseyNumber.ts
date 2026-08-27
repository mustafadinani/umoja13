import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  rosterCheckInIdFor,
  type RegisteredPlayer,
  type RegisteredTeam,
  type UserProfile,
} from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";
import { getCurrentTeamPlayerKeys, getTeamJerseyLockAt } from "../util/roster.js";

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
 * team's real registration captain, an admin-designated coach/manager
 * (Team.coachManagerUids — see assignTeamOfficial; unlike the captain, they
 * aren't necessarily a registered player on the team themselves), or staff
 * (admin/commissioner). Jersey numbers lock for everyone else the moment
 * THIS TEAM's own first scheduled game kicks off (see getTeamJerseyLockAt) —
 * a team that doesn't play until the afternoon keeps editing rights that
 * much longer than one that opens at 8:30 AM. Captains/coach-managers/
 * players are expected to input and lock in every number before their own
 * kickoff, and check-in itself stops offering the jersey-number question
 * once that date passes. Staff stay exempt from that cutoff — a genuine
 * correction found mid-tournament (a real conflict discovered at gate check,
 * a data mixup) needs a live fix, not a trip through direct Firestore access.
 *
 * Only someone with roster authority over the team (captain, coach/manager,
 * staff) can reassign a number that's already claimed by a teammate — a
 * player setting their own number solo still gets a hard "already taken"
 * block, so nobody can casually snipe a teammate's number for themselves.
 * Reassigning clears the number from whoever held it; two players never end
 * up wearing the same number on the same team+category at once.
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

  // Roster authority (captain, coach/manager, staff) can bump a teammate off
  // a number they already hold; a player acting solo on their own number
  // cannot. Computed even for staff callers, so the one code path below
  // covers everyone instead of duplicating the override logic per caller kind.
  let canOverride = isStaffCaller;
  let authorized = isStaffCaller;

  if (!authorized) {
    // This team's real captain, an admin-designated coach/manager (acting
    // on a teammate's behalf either way), or the account this specific
    // playerKey belongs to. playerKey never equals the caller's own uid
    // (it's the Outreach profileId of one specific child, shared-uid
    // families included), so this can't be a simple `uid === playerKey`
    // check — it has to actually look up whose registration row this is.
    const teamSnap = await defaultDb
      .collection(REGISTRATION_ROOT)
      .doc(REGISTRATION_YEAR)
      .collection(TEAMS_REGISTERED)
      .doc(teamId)
      .get();
    const team = teamSnap.data() as RegisteredTeam | undefined;
    const isCaptain = !!team && (team.captainProfileId === uid || team.uid === uid);

    if (isCaptain) {
      authorized = true;
      canOverride = true;
    }

    if (!authorized) {
      const appTeamSnap = await db.collection(COLLECTIONS.teams).doc(teamId).get();
      const coachManagerUids: string[] = appTeamSnap.data()?.coachManagerUids ?? [];
      if (coachManagerUids.includes(uid)) {
        authorized = true;
        canOverride = true;
      }
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
      // authorized-but-solo: canOverride stays false.
    }

    if (!authorized) {
      throw new HttpsError("permission-denied", "Only this player, their team's captain/manager, or staff can set this.");
    }
  }

  // Cutoff for everyone except staff — a player, captain, or coach/manager
  // can't set or change a jersey number once THIS TEAM's own first game has
  // kicked off, whether or not one was ever entered. Staff (admin/
  // commissioner) are deliberately exempt: they're the ones who'd actually
  // need to fix a real conflict discovered mid-tournament.
  if (!isStaffCaller) {
    const lockAt = await getTeamJerseyLockAt(teamId, categoryId);
    if (Date.now() >= lockAt) {
      throw new HttpsError("failed-precondition", "Jersey numbers are locked now that this team's first game has started.");
    }
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
      const realDupes = otherClaims.filter((d) => currentPlayerKeys.has(d.data().userId));
      if (realDupes.length > 0) {
        if (!canOverride) throw new HttpsError("already-exists", `#${jerseyNumber} is already taken on this team.`);
        // Reassign: clear it from whoever held it so the number stays
        // unique on this team+category instead of two players wearing it.
        await Promise.all(realDupes.map((d) => d.ref.update({ jerseyNumber: FieldValue.delete(), updatedAt: Date.now() })));
      }
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
