import { COLLECTIONS, type Team, type CheckInStatus } from "@umoja/shared";
import { db } from "./admin.js";

/**
 * Mirrors a check-in's status (and selfie, once approved) onto the team's
 * roster entry — this is the only check-in data captains/referees/fans ever
 * see; the checkIns collection itself (selfie + gov ID + DOB) stays
 * restricted to the player and staff.
 */
export async function syncRosterCheckInStatus(
  teamId: string,
  userId: string,
  status: CheckInStatus,
  selfieUrl?: string
): Promise<void> {
  const ref = db.collection(COLLECTIONS.teams).doc(teamId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const team = snap.data() as Team;
    const roster = team.roster.map((p) =>
      p.userId === userId ? { ...p, checkInStatus: status, ...(selfieUrl ? { selfieUrl } : {}) } : p
    );
    tx.update(ref, { roster });
  });
}
