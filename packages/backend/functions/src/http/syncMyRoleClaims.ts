import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { auth, db } from "../util/admin.js";

/**
 * Self-service: copies the caller's own Firestore users/{uid}.roles onto
 * their auth token as a custom claim, matching what setUserRole already
 * writes when an admin assigns roles through the app. Needed because not
 * every account's roles field was ever set through setUserRole — the
 * UAT/demo seed script (seed/run.ts) writes roles straight to Firestore, so
 * those accounts' tokens never got the claim at all.
 *
 * This matters because storage.rules' isStaff() can't reliably use a
 * cross-database firestore.get() the way Firestore rules can (Storage
 * Security Rules' cross-service reads only reach the project's `(default)`
 * database — this app's own users collection lives in the named
 * `umoja13-app` database instead) — so storage.rules checks the `roles`
 * custom claim instead, and this callable is what keeps that claim from
 * silently drifting out of sync with the Firestore doc for any account that
 * didn't get it through setUserRole.
 *
 * Called automatically on every sign-in (see AuthProvider) so this never
 * has to be a manual step — a fresh ID token (forced right after) then
 * carries the corrected claim for the client's very next Storage write.
 */
export const syncMyRoleClaims = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const snap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = snap.data()?.roles ?? [];
  await auth.setCustomUserClaims(uid, { roles });
  return { roles };
});
