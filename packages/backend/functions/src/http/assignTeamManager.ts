import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type Role } from "@umoja/shared";
import { auth, db } from "../util/admin.js";
import { buildBaseProfileFromOutreach } from "../util/outreachProfile.js";

interface AssignTeamManagerRequest {
  teamId: string;
  email: string;
}

/**
 * Admin/commissioner-only: attaches an existing account to a team as a
 * coach/manager — independent of registration data, since a coach/manager
 * isn't necessarily a registered player themselves (unlike a real captain,
 * who's derived from the team's own captainProfileId). Writes to
 * umoja13-app/teams/{id}.coachManagerUids (see Team.coachManagerUids), which
 * setJerseyNumber checks alongside the real captain, and also grants the
 * `coach_manager` role on their account — same reasoning as setUserRole
 * granting `captain`: without a role, their account never shows the
 * coach/manager dashboard section at all, even once attached to a team.
 *
 * Requires an existing Firebase Auth account (looked up by email, same as
 * lookupUserByEmail) — this can't create one; the person has to have signed
 * into the app at least once first.
 */
export const assignTeamManager = onCall<AssignTeamManagerRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerDoc = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: Role[] = callerDoc.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only staff can assign a coach/manager.");
  }

  const { teamId } = request.data;
  const email = request.data.email?.trim().toLowerCase();
  if (!teamId || !email) throw new HttpsError("invalid-argument", "teamId and email are required.");

  let targetUid: string;
  try {
    const userRecord = await auth.getUserByEmail(email);
    targetUid = userRecord.uid;
  } catch {
    throw new HttpsError("not-found", `No account found for ${email} — they need to sign into the app at least once first.`);
  }

  await db.collection(COLLECTIONS.teams).doc(teamId).set(
    { coachManagerUids: FieldValue.arrayUnion(targetUid) },
    { merge: true }
  );

  // Seed from Outreach the FIRST time this doc is created — same reasoning
  // as setUserRole: a bare {roles} stub would otherwise become authoritative
  // over their richer Outreach-derived profile (name/photo/family/team
  // memberships) the instant it exists.
  const targetSnap = await db.collection(COLLECTIONS.users).doc(targetUid).get();
  const baseProfile = targetSnap.exists ? {} : await buildBaseProfileFromOutreach(targetUid);
  // Union of whatever roles the account already had and whatever Outreach
  // says it should have (only known once baseProfile is computed above, for
  // a brand-new users/{uid} doc) — same fix as reviewVolunteerApplication.
  // Computing existingRoles from targetSnap ALONE meant a real registered
  // player/fan with no users/{uid} doc yet got only ["coach_manager"]
  // written here, silently dropping their real "player"/"fan" role the
  // instant this doc was created (the exact bug this comment now prevents).
  const existingRoles: Role[] = targetSnap.data()?.roles ?? baseProfile.roles ?? [];
  const roles: Role[] = existingRoles.includes("coach_manager") ? existingRoles : [...existingRoles, "coach_manager"];
  const primaryRole: Role = targetSnap.data()?.primaryRole ?? baseProfile.primaryRole ?? "coach_manager";

  await auth.setCustomUserClaims(targetUid, { roles });
  await db.collection(COLLECTIONS.users).doc(targetUid).set(
    { ...baseProfile, roles, primaryRole, updatedAt: Date.now() },
    { merge: true }
  );

  return { ok: true, uid: targetUid };
});

interface RemoveTeamManagerRequest {
  teamId: string;
  uid: string;
}

/**
 * Admin/commissioner-only: detaches a coach/manager from a team. Deliberately
 * doesn't touch their `coach_manager` role — mirrors how removing someone
 * from a real team's registration never strips their `captain` role either;
 * a stray role with no team attached is inert (their "managed teams"
 * dashboard section just renders empty).
 */
export const removeTeamManager = onCall<RemoveTeamManagerRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerDoc = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: Role[] = callerDoc.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only staff can remove a coach/manager.");
  }

  const { teamId, uid } = request.data;
  if (!teamId || !uid) throw new HttpsError("invalid-argument", "teamId and uid are required.");

  await db.collection(COLLECTIONS.teams).doc(teamId).set(
    { coachManagerUids: FieldValue.arrayRemove(uid) },
    { merge: true }
  );

  return { ok: true };
});
