import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  TOURNAMENT_START_AT,
  rosterCheckInIdFor,
  type RegisteredTeam,
  type RosterCheckIn,
  type UserProfile,
} from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";

interface SetJerseyNumberRequest {
  teamId: string;
  userId: string;
  categoryId: string;
  /** null clears it (only meaningful before it's ever been set — see the lock below). */
  jerseyNumber: number | null;
}

/**
 * Sets a player's jersey number on their rosterCheckIns overlay doc — either
 * the player setting their own (optional, offered during check-in) or their
 * team's captain/manager setting it on their behalf. Once a number is on
 * file AND the tournament has started, nobody (player or captain) can
 * change it — the whole point is that a player uses the same number for
 * the entire tournament. Setting a number for the first time still works
 * even after the tournament has started (a late arrival's first check-in).
 */
export const setJerseyNumber = onCall<SetJerseyNumberRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, userId, categoryId, jerseyNumber } = request.data;
  if (!teamId || !userId || !categoryId) {
    throw new HttpsError("invalid-argument", "teamId, userId, and categoryId are required.");
  }
  if (jerseyNumber !== null && (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 999)) {
    throw new HttpsError("invalid-argument", "jerseyNumber must be a whole number between 0 and 999, or null.");
  }

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerProfile = callerSnap.data() as UserProfile | undefined;
  const isStaffCaller = callerProfile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;

  if (!isStaffCaller && uid !== userId) {
    // Not the player themselves — must be this team's captain/manager to act on someone else's behalf.
    const teamSnap = await defaultDb
      .collection(REGISTRATION_ROOT)
      .doc(REGISTRATION_YEAR)
      .collection(TEAMS_REGISTERED)
      .doc(teamId)
      .get();
    const team = teamSnap.data() as RegisteredTeam | undefined;
    const isCaptain = !!team && (team.captainProfileId === uid || team.uid === uid);
    if (!isCaptain) {
      throw new HttpsError("permission-denied", "Only this player, their team's captain, or staff can set this.");
    }
  }

  const id = rosterCheckInIdFor(teamId, userId, categoryId);
  const ref = db.collection(COLLECTIONS.rosterCheckIns).doc(id);
  const existing = (await ref.get()).data() as RosterCheckIn | undefined;

  // Once a number is on file and the tournament has started, it's locked — for
  // everyone, including staff going through this same path (a genuine
  // correction should go through direct Firestore access, not this callable).
  if (existing?.jerseyNumber != null && Date.now() >= TOURNAMENT_START_AT) {
    throw new HttpsError(
      "failed-precondition",
      "This player's jersey number is locked for the rest of the tournament."
    );
  }

  if (jerseyNumber !== null) {
    const dupeSnap = await db
      .collection(COLLECTIONS.rosterCheckIns)
      .where("teamId", "==", teamId)
      .where("categoryId", "==", categoryId)
      .where("jerseyNumber", "==", jerseyNumber)
      .get();
    const dupe = dupeSnap.docs.find((d) => d.data().userId !== userId);
    if (dupe) throw new HttpsError("already-exists", `#${jerseyNumber} is already taken on this team.`);
  }

  await ref.set(
    {
      id,
      teamId,
      userId,
      categoryId,
      jerseyNumber: jerseyNumber === null ? FieldValue.delete() : jerseyNumber,
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { ok: true };
});
