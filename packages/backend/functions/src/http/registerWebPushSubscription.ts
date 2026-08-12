import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type WebPushSubscription } from "@umoja/shared";
import { db } from "../util/admin.js";

interface RegisterWebPushSubscriptionRequest {
  subscription: WebPushSubscription | null;
}

/**
 * Signed-in user registers (or clears) their own browser's Web Push
 * subscription — the browser equivalent of registerPushToken's Expo token.
 * Same reasoning for going through a Cloud Function rather than a direct
 * client write: users/{uid}'s self-update rule only permits certain roles
 * through, so this needs to be Admin-SDK.
 */
export const registerWebPushSubscription = onCall<RegisterWebPushSubscriptionRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { subscription } = request.data;
  await db.collection(COLLECTIONS.users).doc(uid).set(
    { webPushSubscription: subscription ?? null, updatedAt: Date.now() },
    { merge: true }
  );

  return { ok: true };
});
