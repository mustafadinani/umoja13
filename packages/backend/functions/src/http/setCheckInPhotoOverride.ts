import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type CheckIn } from "@umoja/shared";
import { db } from "../util/admin.js";
import { syncRosterCheckInStatus } from "../util/roster.js";

interface SetCheckInPhotoOverrideRequest {
  checkInId: string;
  /** null clears the override, reverting to the default precedence (approved selfie wins, else registration photo). */
  override: "selfie" | "registration" | null;
}

/**
 * Admin/commissioner-only: picks which photo (the check-in selfie or the
 * Outreach registration photo) shows on this player's card everywhere in
 * the app, overriding the default "approved selfie wins" precedence — for
 * when one photo is clearly more usable than the other regardless of
 * check-in status. Mirrors the choice onto rosterCheckIns (what
 * registeredPlayerToRosterEntry actually reads) and force-syncs the raw
 * selfie there too, since it's otherwise only copied over on approval.
 */
export const setCheckInPhotoOverride = onCall<SetCheckInPhotoOverrideRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = callerSnap.data()?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can set this.");
  }

  const { checkInId, override } = request.data;
  if (override !== "selfie" && override !== "registration" && override !== null) {
    throw new HttpsError("invalid-argument", 'override must be "selfie", "registration", or null.');
  }

  const ref = db.collection(COLLECTIONS.checkIns).doc(checkInId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Check-in not found.");
  const checkIn = snap.data() as CheckIn;
  const playerKey = checkIn.playerKey ?? checkIn.userId;

  await ref.set(
    { cardPhotoOverride: override ?? FieldValue.delete(), updatedAt: Date.now() },
    { merge: true }
  );
  await syncRosterCheckInStatus(
    checkIn.teamId,
    playerKey,
    checkIn.categoryId,
    checkIn.status,
    checkIn.selfieUrl,
    undefined,
    undefined,
    override
  );

  return { ok: true };
});
