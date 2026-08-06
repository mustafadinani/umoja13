import { COLLECTIONS, type CheckInStatus } from "@umoja/shared";
import { db } from "./admin.js";

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
 */
export async function syncRosterCheckInStatus(
  teamId: string,
  userId: string,
  categoryId: string,
  status: CheckInStatus,
  selfieUrl?: string,
  lineOfWork?: string,
  currentEmployer?: string
): Promise<void> {
  const id = `${teamId}_${userId}_${categoryId}`;
  await db.collection(COLLECTIONS.rosterCheckIns).doc(id).set(
    {
      id,
      teamId,
      userId,
      categoryId,
      status,
      ...(selfieUrl ? { selfieUrl } : {}),
      ...(lineOfWork ? { lineOfWork } : {}),
      ...(currentEmployer ? { currentEmployer } : {}),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
