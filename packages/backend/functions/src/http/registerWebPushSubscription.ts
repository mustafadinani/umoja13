import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type WebPushSubscription } from "@umoja/shared";
import { auth, db } from "../util/admin.js";

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

  // A real Firebase Auth account that had never opened the app before (e.g.
  // an Outreach-only fan browsing the public site) has no users/{uid} doc
  // yet — a bare {webPushSubscription} merge would create one with no
  // displayName/email, which crashes every admin screen that lists users
  // and calls .toLowerCase() on those fields (see UsersAdminTab.tsx). Seed
  // them from the Auth record the same way setUserRole.ts does, but only
  // when the doc doesn't already exist — never clobber a real profile.
  const targetSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const seed: Partial<{ email: string; displayName: string }> = {};
  if (!targetSnap.exists) {
    const authUser = await auth.getUser(uid);
    seed.email = authUser.email ?? "";
    seed.displayName = authUser.displayName ?? authUser.email ?? "Unnamed user";
  }

  await db.collection(COLLECTIONS.users).doc(uid).set(
    { ...seed, webPushSubscription: subscription ?? null, updatedAt: Date.now() },
    { merge: true }
  );

  return { ok: true };
});
