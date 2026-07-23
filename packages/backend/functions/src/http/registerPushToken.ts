import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../util/admin.js";

interface RegisterPushTokenRequest {
  token: string | null;
}

/**
 * Signed-in user registers (or clears) their own device's Expo push token.
 * Routed through a Cloud Function rather than a direct client write because
 * the users/{uid} security rule's self-update branch only permits
 * fan/player/captain-role documents through — referees, volunteers, etc.
 * would otherwise be unable to update their own doc at all.
 */
export const registerPushToken = onCall<RegisterPushTokenRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { token } = request.data;
  await db.collection(COLLECTIONS.users).doc(uid).set(
    { pushToken: token ?? null, updatedAt: Date.now() },
    { merge: true }
  );

  return { ok: true };
});
