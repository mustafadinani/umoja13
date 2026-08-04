import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, ROLES, type Role } from "@umoja/shared";
import { db } from "../util/admin.js";

interface SetActiveRoleRequest {
  role: Role;
}

/**
 * Lets a signed-in user switch which of their own roles is "active" (drives
 * which dashboard Dashboard.tsx renders) — this never grants a new role, it
 * only reorders primaryRole among roles the caller already holds, so it's
 * safe to run without the admin gate setUserRole requires.
 */
export const setActiveRole = onCall<SetActiveRoleRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { role } = request.data;
  if (!role || !ROLES.includes(role)) throw new HttpsError("invalid-argument", "A valid role is required.");

  const ref = db.collection(COLLECTIONS.users).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "User profile not found.");
  const roles: Role[] = snap.data()?.roles ?? [];
  if (!roles.includes(role)) {
    throw new HttpsError("permission-denied", "You can only switch to a role you already hold.");
  }

  await ref.set({ primaryRole: role, updatedAt: Date.now() }, { merge: true });
  return { ok: true };
});
