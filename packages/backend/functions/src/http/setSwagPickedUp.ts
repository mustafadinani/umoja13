import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, rosterCheckInIdFor, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";

interface SetSwagPickedUpRequest {
  teamId: string;
  /** Per-child identifier — see RosterEntry.playerKey. Never the caller's bare account uid. */
  playerKey: string;
  categoryId: string;
  pickedUp: boolean;
}

/**
 * Toggles whether a player has picked up their tournament swag, on the same
 * rosterCheckIns overlay doc jerseyNumber already lives on. Staff-only —
 * unlike jerseyNumber (which a player or their captain/manager can set
 * themselves), swag pickup is confirmed by whoever's actually staffing the
 * swag table, not self-reported. No lock, no conflict to resolve — just a
 * boolean flip.
 */
export const setSwagPickedUp = onCall<SetSwagPickedUpRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, playerKey, categoryId, pickedUp } = request.data;
  if (!teamId || !playerKey || !categoryId) {
    throw new HttpsError("invalid-argument", "teamId, playerKey, and categoryId are required.");
  }
  if (typeof pickedUp !== "boolean") {
    throw new HttpsError("invalid-argument", "pickedUp must be a boolean.");
  }

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerProfile = callerSnap.data() as UserProfile | undefined;
  const isStaffCaller = callerProfile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  if (!isStaffCaller) {
    throw new HttpsError("permission-denied", "Only staff can record swag pickup.");
  }

  const id = rosterCheckInIdFor(teamId, playerKey, categoryId);
  await db.collection(COLLECTIONS.rosterCheckIns).doc(id).set(
    { id, teamId, userId: playerKey, categoryId, swagPickedUp: pickedUp, updatedAt: Date.now() },
    { merge: true }
  );

  return { ok: true };
});
