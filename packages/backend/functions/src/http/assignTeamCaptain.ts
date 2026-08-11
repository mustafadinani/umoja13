import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, rosterCheckInIdFor, type Role } from "@umoja/shared";
import { auth, db } from "../util/admin.js";
import { buildBaseProfileFromOutreach } from "../util/outreachProfile.js";

async function isTeamCoachOrStaff(callerUid: string, teamId: string): Promise<boolean> {
  const callerDoc = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: Role[] = callerDoc.data()?.roles ?? [];
  if (callerRoles.includes("admin") || callerRoles.includes("commissioner")) return true;
  const teamSnap = await db.collection(COLLECTIONS.teams).doc(teamId).get();
  const coachManagerUids: string[] = teamSnap.data()?.coachManagerUids ?? [];
  return coachManagerUids.includes(callerUid);
}

interface AssignTeamCaptainRequest {
  teamId: string;
  categoryId: string;
  /** See RosterEntry.playerKey — never the bare account uid; picks out one specific roster row. */
  playerKey: string;
  /** The roster row's account uid — whose `roles` gets the real `captain` role granted (see below). */
  targetUid: string;
}

/**
 * A team's coach/manager (or staff) appoints a roster member as captain —
 * additive to the team's real registration captain (captainProfileId),
 * so a team can have both at once (or several coach-appointed co-captains).
 * Sets RosterCheckIn.appointedCaptain, which feeds RosterEntry.isCaptain the
 * same way jerseyNumber already flows through this same overlay doc (see
 * registeredPlayerToRosterEntry). Also grants the target account's own
 * `captain` role — without it, their dashboard never routes to
 * PlayerDashboard/shows Captain Tools at all, even once appointed (same
 * reasoning as assignTeamManager granting `coach_manager`).
 */
export const assignTeamCaptain = onCall<AssignTeamCaptainRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, categoryId, playerKey, targetUid } = request.data;
  if (!teamId || !categoryId || !playerKey || !targetUid) {
    throw new HttpsError("invalid-argument", "teamId, categoryId, playerKey, and targetUid are required.");
  }

  if (!(await isTeamCoachOrStaff(callerUid, teamId))) {
    throw new HttpsError("permission-denied", "Only this team's coach/manager or staff can appoint a captain.");
  }

  const id = rosterCheckInIdFor(teamId, playerKey, categoryId);
  await db.collection(COLLECTIONS.rosterCheckIns).doc(id).set(
    { id, teamId, userId: playerKey, categoryId, appointedCaptain: true, updatedAt: Date.now() },
    { merge: true }
  );

  // Seed from Outreach the FIRST time this doc is created — same reasoning
  // as assignTeamManager: a bare {roles} stub would otherwise become
  // authoritative over their richer Outreach-derived profile the instant it
  // exists.
  const targetSnap = await db.collection(COLLECTIONS.users).doc(targetUid).get();
  const existingRoles: Role[] = targetSnap.data()?.roles ?? [];
  const roles: Role[] = existingRoles.includes("captain") ? existingRoles : [...existingRoles, "captain"];
  const primaryRole: Role = targetSnap.data()?.primaryRole ?? "captain";
  const baseProfile = targetSnap.exists ? {} : await buildBaseProfileFromOutreach(targetUid);

  await auth.setCustomUserClaims(targetUid, { roles });
  await db.collection(COLLECTIONS.users).doc(targetUid).set(
    { ...baseProfile, roles, primaryRole, updatedAt: Date.now() },
    { merge: true }
  );

  return { ok: true };
});

interface RemoveTeamCaptainRequest {
  teamId: string;
  categoryId: string;
  playerKey: string;
}

/**
 * Reverses assignTeamCaptain. Deliberately doesn't touch the `captain` role
 * on their account — mirrors removeTeamManager's reasoning: a stray role
 * with no team attached is inert (Captain Tools for that team just stops
 * rendering once isCaptain flips back to false).
 */
export const removeTeamCaptain = onCall<RemoveTeamCaptainRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, categoryId, playerKey } = request.data;
  if (!teamId || !categoryId || !playerKey) {
    throw new HttpsError("invalid-argument", "teamId, categoryId, and playerKey are required.");
  }

  if (!(await isTeamCoachOrStaff(callerUid, teamId))) {
    throw new HttpsError("permission-denied", "Only this team's coach/manager or staff can remove an appointed captain.");
  }

  const id = rosterCheckInIdFor(teamId, playerKey, categoryId);
  await db.collection(COLLECTIONS.rosterCheckIns).doc(id).set(
    { appointedCaptain: FieldValue.delete(), updatedAt: Date.now() },
    { merge: true }
  );

  return { ok: true };
});
