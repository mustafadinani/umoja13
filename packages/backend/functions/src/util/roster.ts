import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  jerseyLockAt,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  resolvePlayerCategoryId,
  type CheckInStatus,
  type Game,
  type RegisteredPlayer,
} from "@umoja/shared";
import { db, defaultDb } from "./admin.js";

/**
 * Mirrors a check-in's status (and selfie, once approved) into the
 * `rosterCheckIns` collection — a PII-free doc keyed by team+player+category
 * that's public to read, unlike the `checkIns` doc itself (gov ID, DOB,
 * identity selfie), which stays restricted to the player and staff. This is
 * the only check-in data captains/referees/fans ever see on a roster.
 *
 * Deliberately NOT written onto `teams/{teamId}.roster` (the app's own,
 * pre-Outreach-import `teams` collection) — every roster read in this app
 * now comes from the `(default)` registration import instead
 * (buildTeamFromRegistration), so a write there would sync into a
 * collection nothing displays.
 *
 * `playerKey` (not the caller's account uid) is what actually identifies
 * which child this is — pass CheckIn.playerKey (falling back to
 * CheckIn.userId only for check-ins written before that field existed).
 */
export async function syncRosterCheckInStatus(
  teamId: string,
  playerKey: string,
  categoryId: string,
  status: CheckInStatus,
  selfieUrl?: string,
  lineOfWork?: string,
  currentEmployer?: string,
  /** `undefined` (the default): leave whatever's already on the doc untouched. `null`: explicitly clear it. A value: set it. */
  cardPhotoOverride?: "selfie" | "registration" | null
): Promise<void> {
  const id = `${teamId}_${playerKey}_${categoryId}`;
  await db.collection(COLLECTIONS.rosterCheckIns).doc(id).set(
    {
      id,
      teamId,
      userId: playerKey,
      categoryId,
      status,
      ...(selfieUrl ? { selfieUrl } : {}),
      ...(lineOfWork ? { lineOfWork } : {}),
      ...(currentEmployer ? { currentEmployer } : {}),
      ...(cardPhotoOverride !== undefined ? { cardPhotoOverride: cardPhotoOverride ?? FieldValue.delete() } : {}),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * The real, current set of account uids on a team's roster, straight from
 * the `(default)` registration import — the same source buildTeamFromRegistration
 * uses on the client, and the same query postDeclineToTeamChannel already
 * used to compute who to notify. This is the ONLY correct source of "who's
 * actually on this team right now"; `teams/{teamId}.roster` (this app's own,
 * pre-Outreach-import teams collection) is dead data nothing has written
 * since the Outreach import replaced it, so it must never be trusted for an
 * access check again — see syncTeamRosterUidsFromRegistration below for why
 * that matters.
 */
export async function getCurrentTeamRosterUids(teamId: string): Promise<string[]> {
  if (!teamId) return [];
  const playersSnap = await defaultDb
    .collection(REGISTRATION_ROOT)
    .doc(REGISTRATION_YEAR)
    .collection(PLAYERS_REGISTERED)
    .where("teamId", "==", teamId)
    .get();
  return [...new Set(playersSnap.docs.map((d) => (d.data() as RegisteredPlayer).uid).filter((v): v is string => !!v))];
}

/**
 * The set of `playerKey`s (see playerKeyFor) currently on a team's roster
 * for one category, straight from the same `(default)` registration import
 * getCurrentTeamRosterUids uses — the only correct source of "who's really
 * on this team right now."
 *
 * Needed because `rosterCheckIns` (where jersey numbers live) is an
 * append-only overlay keyed by playerKey that's never pruned: if a player's
 * registration record is later corrected (a profileId fix, a re-submitted
 * registration under a new row), the OLD playerKey's rosterCheckIns doc —
 * including whatever jersey number was on it — just sits there forever,
 * orphaned from anyone actually on the roster today. A duplicate-jersey
 * check that only looks at rosterCheckIns docs (see setJerseyNumber.ts) can
 * therefore flag a number as "taken" by a playerKey nobody on the current
 * roster actually holds. Cross-checking against this set is what makes that
 * check trustworthy.
 */
export async function getCurrentTeamPlayerKeys(teamId: string, categoryId: string): Promise<Set<string>> {
  if (!teamId) return new Set();
  const playersSnap = await defaultDb
    .collection(REGISTRATION_ROOT)
    .doc(REGISTRATION_YEAR)
    .collection(PLAYERS_REGISTERED)
    .where("teamId", "==", teamId)
    .get();
  const keys = new Set<string>();
  for (const doc of playersSnap.docs) {
    const p = doc.data() as RegisteredPlayer;
    if (resolvePlayerCategoryId(p) !== categoryId) continue;
    keys.add(p.profileId?.trim() || doc.id);
  }
  return keys;
}

/**
 * Firestore security rules can't run the query above at read time, so
 * `teamChannels/{teamId}`'s read rule instead checks a precomputed
 * `teams/{teamId}.rosterUids` field — this keeps that field mirroring the
 * real roster above. Call this whenever a player's team assignment could
 * have changed (see onPlayerRegisteredWrite) so the channel's access list
 * never drifts from who's actually on the team.
 */
export async function syncTeamRosterUidsFromRegistration(teamId: string): Promise<void> {
  if (!teamId) return;
  const rosterUids = (await getCurrentTeamRosterUids(teamId)).sort();
  await db.collection(COLLECTIONS.teams).doc(teamId).set({ rosterUids }, { merge: true });
}

/**
 * Authoritative "when do jersey numbers lock" instant for one team+category —
 * the kickoff of that team's own earliest scheduled game (falling back to the
 * tournament-wide TOURNAMENT_START_AT if its schedule isn't posted yet; see
 * jerseyLockAt, types/game.ts). Queried fresh on every setJerseyNumber call
 * rather than trusting anything client-supplied, same as every other
 * server-side check in that function.
 */
export async function getTeamJerseyLockAt(teamId: string, categoryId: string): Promise<number> {
  const gamesSnap = await db.collection(COLLECTIONS.games).where("categoryId", "==", categoryId).get();
  const games = gamesSnap.docs.map((d) => d.data() as Game);
  return jerseyLockAt(games, teamId, categoryId);
}
