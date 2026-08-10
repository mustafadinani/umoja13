import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, ROLES, type Role } from "@umoja/shared";
import { auth, db } from "../util/admin.js";
import { ensureInGeneralPod } from "../util/generalPod.js";
import { buildBaseProfileFromOutreach } from "../util/outreachProfile.js";

const POD_ELIGIBLE_ROLES: Role[] = ["admin", "commissioner", "referee", "volunteer"];

interface SetUserRoleRequest {
  targetUid: string;
  roles: Role[];
  primaryRole: Role;
}

/**
 * Admin-only: assigns roles to a user. Writes both custom claims (for fast
 * client-side gating) and the Firestore users/{uid}.roles field (source of
 * truth read by security rules and the app UI) atomically.
 */
export const setUserRole = onCall<SetUserRoleRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerDoc = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: Role[] = callerDoc.data()?.roles ?? [];
  if (!callerRoles.includes("admin")) {
    throw new HttpsError("permission-denied", "Only admins can assign roles.");
  }

  const { targetUid, roles, primaryRole } = request.data;
  if (!targetUid || !Array.isArray(roles) || roles.length === 0) {
    throw new HttpsError("invalid-argument", "targetUid and a non-empty roles array are required.");
  }
  for (const r of roles) {
    if (!ROLES.includes(r)) throw new HttpsError("invalid-argument", `Unknown role: ${r}`);
  }
  if (!roles.includes(primaryRole)) {
    throw new HttpsError("invalid-argument", "primaryRole must be one of the assigned roles.");
  }

  // Seed from their real Outreach registration data the FIRST time this doc
  // is created — otherwise a bare {roles} stub becomes authoritative over
  // their richer Outreach-derived profile the instant it exists (see
  // useResolvedProfile), silently blanking their real name/photo/family/team
  // memberships the next time they open the app. No-op ({}) for an account
  // with no Outreach history (the normal case for a staff-only account) and
  // for an account that already has a users doc (never overwrite in place).
  const targetSnap = await db.collection(COLLECTIONS.users).doc(targetUid).get();
  const baseProfile = targetSnap.exists ? {} : await buildBaseProfileFromOutreach(targetUid);

  await auth.setCustomUserClaims(targetUid, { roles });
  await db.collection(COLLECTIONS.users).doc(targetUid).set(
    { ...baseProfile, roles, primaryRole, updatedAt: Date.now() },
    { merge: true }
  );

  if (roles.some((r) => POD_ELIGIBLE_ROLES.includes(r))) {
    await ensureInGeneralPod(targetUid);
  }

  return { ok: true };
});
