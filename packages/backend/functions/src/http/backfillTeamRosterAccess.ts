import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, REGISTRATION_ROOT, REGISTRATION_YEAR, TEAMS_REGISTERED } from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";
import { syncTeamRosterUidsFromRegistration } from "../util/roster.js";

/**
 * One-time (admin-triggered, re-runnable) fix for every team's channel
 * access at once: recomputes `teams/{teamId}.rosterUids` for every
 * registered team from the real, current registration roster.
 *
 * Needed because `teams/{teamId}.rosterUids` used to be derived from
 * `teams/{teamId}.roster` — this app's own pre-Outreach-import teams
 * collection, which nothing has written since the Outreach import replaced
 * it (see util/roster.ts). Until this runs, existing teams' channel access
 * still reflects that old, frozen roster instead of who's actually on the
 * team today. onPlayerRegisteredWrite keeps things correct going forward;
 * this repairs everything that predates it.
 */
export const backfillTeamRosterAccess = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = callerSnap.data()?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can run this.");
  }

  const teamsSnap = await defaultDb
    .collection(REGISTRATION_ROOT)
    .doc(REGISTRATION_YEAR)
    .collection(TEAMS_REGISTERED)
    .get();

  let fixed = 0;
  for (const teamDoc of teamsSnap.docs) {
    await syncTeamRosterUidsFromRegistration(teamDoc.id);
    fixed += 1;
  }

  return { teamsFixed: fixed };
});
