import { COLLECTIONS, REGISTRATION_ROOT, REGISTRATION_YEAR, TEAMS_REGISTERED } from "@umoja/shared";
import { db, defaultDb } from "./admin.js";

/**
 * True if this uid is a real registration captain of ANY team (same check
 * setJerseyNumber applies per-team: team.captainProfileId === uid or
 * team.uid === uid), or an admin-designated coach/manager of any team
 * (Team.coachManagerUids — see assignTeamOfficial). Used to gate the
 * commissioner report/complaint flow to captains/managers only — the UI
 * already only shows that button to this group; this is the server-side
 * enforcement so the callable can't be hit directly to bypass it.
 */
export async function isCaptainOrCoachManager(uid: string): Promise<boolean> {
  const teamsRegistered = defaultDb.collection(REGISTRATION_ROOT).doc(REGISTRATION_YEAR).collection(TEAMS_REGISTERED);
  const [byCaptainProfileId, byTeamUid, byCoachManager] = await Promise.all([
    teamsRegistered.where("captainProfileId", "==", uid).limit(1).get(),
    teamsRegistered.where("uid", "==", uid).limit(1).get(),
    db.collection(COLLECTIONS.teams).where("coachManagerUids", "array-contains", uid).limit(1).get(),
  ]);
  return !byCaptainProfileId.empty || !byTeamUid.empty || !byCoachManager.empty;
}
