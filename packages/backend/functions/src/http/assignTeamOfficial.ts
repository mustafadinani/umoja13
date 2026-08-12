import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  MAX_TEAM_OFFICIALS,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  rosterCheckInIdFor,
  type OfficialKind,
  type Role,
} from "@umoja/shared";
import { auth, db, defaultDb } from "../util/admin.js";
import { buildBaseProfileFromOutreach } from "../util/outreachProfile.js";

/**
 * Replaces the old separate assignTeamCaptain/assignTeamManager (and their
 * matching remove callables) with one pair covering both kinds of team
 * official. Two things changed on purpose, per the Team Officials redesign:
 *
 *  1. Permission is broader than either predecessor — staff OR ANY current
 *     official of the team (real captain, appointed co-captain, or
 *     coach/manager) can add or remove another one. The old assignTeamCaptain
 *     already allowed a coach/manager to appoint co-captains; assignTeamManager
 *     was staff-only for attaching a coach/manager. This unifies both onto the
 *     same self-serve rule.
 *  2. Both kinds grant the account the SAME role, `captain` — coach_manager is
 *     never granted by this file. It still exists as legacy data on accounts
 *     appointed before this change (see roles.ts's roleIncludesPlayerDashboard,
 *     which keeps treating it as equivalent for dashboard-gating purposes), but
 *     nothing here writes it again.
 *
 * Deliberately never touches RegisteredTeam.captainProfileId — the team's real
 * registration captain isn't part of this assignable system at all (see
 * MAX_TEAM_OFFICIALS's comment); there's no code path to remove or reassign it.
 */

export async function isTeamOfficialOrStaff(callerUid: string, teamId: string): Promise<boolean> {
  const callerDoc = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: Role[] = callerDoc.data()?.roles ?? [];
  if (callerRoles.includes("admin") || callerRoles.includes("commissioner")) return true;

  const teamSnap = await db.collection(COLLECTIONS.teams).doc(teamId).get();
  const coachManagerUids: string[] = teamSnap.data()?.coachManagerUids ?? [];
  if (coachManagerUids.includes(callerUid)) return true;

  const regSnap = await defaultDb
    .collection(REGISTRATION_ROOT)
    .doc(REGISTRATION_YEAR)
    .collection(TEAMS_REGISTERED)
    .doc(teamId)
    .get();
  const reg = regSnap.data();
  if (reg && (reg.captainProfileId === callerUid || reg.uid === callerUid)) return true;

  // Appointed co-captain: rosterCheckIns key appointedCaptain by playerKey
  // (RosterCheckIn.userId), not account uid, so this has to resolve the
  // caller's own playerKey(s) first — same lookup setJerseyNumber uses to
  // authorize a player editing their own number.
  const myPlayersSnap = await defaultDb
    .collection(REGISTRATION_ROOT)
    .doc(REGISTRATION_YEAR)
    .collection(PLAYERS_REGISTERED)
    .where("uid", "==", callerUid)
    .get();
  const myPlayerKeys = new Set(myPlayersSnap.docs.map((d) => d.data().profileId?.trim() || d.id));
  if (myPlayerKeys.size === 0) return false;

  const appointedSnap = await db
    .collection(COLLECTIONS.rosterCheckIns)
    .where("teamId", "==", teamId)
    .where("appointedCaptain", "==", true)
    .get();
  return appointedSnap.docs.some((d) => myPlayerKeys.has(d.data().userId));
}

/**
 * The team's current assignable-officials pool — see MAX_TEAM_OFFICIALS for
 * exactly what this does and doesn't count.
 */
async function currentOfficials(teamId: string): Promise<{ appointedPlayerKeys: Set<string>; coachManagerUids: string[] }> {
  const [appointedSnap, teamSnap] = await Promise.all([
    db.collection(COLLECTIONS.rosterCheckIns).where("teamId", "==", teamId).where("appointedCaptain", "==", true).get(),
    db.collection(COLLECTIONS.teams).doc(teamId).get(),
  ]);
  return {
    appointedPlayerKeys: new Set(appointedSnap.docs.map((d) => d.data().userId as string)),
    coachManagerUids: teamSnap.data()?.coachManagerUids ?? [],
  };
}

/**
 * Grants `captain` — see this file's top comment for why both official kinds
 * land on the same role. Same Outreach-seeding reasoning the two predecessor
 * callables each had: a bare {roles} stub would otherwise become
 * authoritative over their richer Outreach-derived profile the instant a
 * users/{uid} doc is created here for the first time.
 */
async function grantOfficialRole(targetUid: string): Promise<void> {
  const targetSnap = await db.collection(COLLECTIONS.users).doc(targetUid).get();
  const baseProfile = targetSnap.exists ? {} : await buildBaseProfileFromOutreach(targetUid);
  const existingRoles: Role[] = targetSnap.data()?.roles ?? baseProfile.roles ?? [];
  const roles: Role[] = existingRoles.includes("captain") ? existingRoles : [...existingRoles, "captain"];
  const primaryRole: Role = targetSnap.data()?.primaryRole ?? baseProfile.primaryRole ?? "captain";

  await auth.setCustomUserClaims(targetUid, { roles });
  await db.collection(COLLECTIONS.users).doc(targetUid).set(
    { ...baseProfile, roles, primaryRole, updatedAt: Date.now() },
    { merge: true }
  );
}

interface AssignTeamOfficialRequest {
  teamId: string;
  kind: OfficialKind;
  // kind: "captain" — picks one specific roster row (see RosterEntry.playerKey)
  categoryId?: string;
  playerKey?: string;
  /** The roster row's account uid — see grantOfficialRole. */
  targetUid?: string;
  // kind: "manager_coach" — doesn't have to be a registered player at all;
  // requires an existing account, looked up by email (same as assignTeamManager did).
  email?: string;
}

export const assignTeamOfficial = onCall<AssignTeamOfficialRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, kind } = request.data;
  if (!teamId || (kind !== "captain" && kind !== "manager_coach")) {
    throw new HttpsError("invalid-argument", 'teamId and a valid kind ("captain" or "manager_coach") are required.');
  }

  if (!(await isTeamOfficialOrStaff(callerUid, teamId))) {
    throw new HttpsError("permission-denied", "Only this team's officials or staff can add another one.");
  }

  const { appointedPlayerKeys, coachManagerUids } = await currentOfficials(teamId);
  const currentCount = appointedPlayerKeys.size + coachManagerUids.length;

  if (kind === "captain") {
    const { categoryId, playerKey, targetUid } = request.data;
    if (!categoryId || !playerKey || !targetUid) {
      throw new HttpsError("invalid-argument", 'categoryId, playerKey, and targetUid are required for kind "captain".');
    }
    if (!appointedPlayerKeys.has(playerKey) && currentCount >= MAX_TEAM_OFFICIALS) {
      throw new HttpsError("failed-precondition", `A team can have at most ${MAX_TEAM_OFFICIALS} officials.`);
    }

    const id = rosterCheckInIdFor(teamId, playerKey, categoryId);
    await db.collection(COLLECTIONS.rosterCheckIns).doc(id).set(
      { id, teamId, userId: playerKey, categoryId, appointedCaptain: true, updatedAt: Date.now() },
      { merge: true }
    );
    await grantOfficialRole(targetUid);
    return { ok: true };
  }

  const email = request.data.email?.trim().toLowerCase();
  if (!email) throw new HttpsError("invalid-argument", 'email is required for kind "manager_coach".');

  let targetUid: string;
  try {
    const userRecord = await auth.getUserByEmail(email);
    targetUid = userRecord.uid;
  } catch {
    throw new HttpsError("not-found", `No account found for ${email} — they need to sign into the app at least once first.`);
  }

  if (!coachManagerUids.includes(targetUid) && currentCount >= MAX_TEAM_OFFICIALS) {
    throw new HttpsError("failed-precondition", `A team can have at most ${MAX_TEAM_OFFICIALS} officials.`);
  }

  await db.collection(COLLECTIONS.teams).doc(teamId).set(
    { coachManagerUids: FieldValue.arrayUnion(targetUid) },
    { merge: true }
  );
  await grantOfficialRole(targetUid);
  return { ok: true, uid: targetUid };
});

interface RemoveTeamOfficialRequest {
  teamId: string;
  kind: OfficialKind;
  categoryId?: string;
  playerKey?: string;
  uid?: string;
}

/**
 * Reverses assignTeamOfficial. Deliberately doesn't touch the `captain` role
 * on the target's account — same reasoning both predecessor callables
 * already had: a stray role with no team attached is inert (their tools for
 * that specific team just stop rendering once isCaptain/coachManagerUids
 * membership flips back to false).
 */
export const removeTeamOfficial = onCall<RemoveTeamOfficialRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, kind } = request.data;
  if (!teamId || (kind !== "captain" && kind !== "manager_coach")) {
    throw new HttpsError("invalid-argument", 'teamId and a valid kind ("captain" or "manager_coach") are required.');
  }

  if (!(await isTeamOfficialOrStaff(callerUid, teamId))) {
    throw new HttpsError("permission-denied", "Only this team's officials or staff can remove one.");
  }

  if (kind === "captain") {
    const { categoryId, playerKey } = request.data;
    if (!categoryId || !playerKey) {
      throw new HttpsError("invalid-argument", 'categoryId and playerKey are required for kind "captain".');
    }
    const id = rosterCheckInIdFor(teamId, playerKey, categoryId);
    await db.collection(COLLECTIONS.rosterCheckIns).doc(id).set(
      { appointedCaptain: FieldValue.delete(), updatedAt: Date.now() },
      { merge: true }
    );
    return { ok: true };
  }

  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", 'uid is required for kind "manager_coach".');
  await db.collection(COLLECTIONS.teams).doc(teamId).set(
    { coachManagerUids: FieldValue.arrayRemove(uid) },
    { merge: true }
  );
  return { ok: true };
});

interface GetTeamOfficialNamesRequest {
  teamId: string;
}

/**
 * Resolves this team's coachManagerUids to display names, for the self-serve
 * Team Officials list (CaptainRoster.tsx's AddTeamOfficialPanel / its
 * successor) to show who's currently a manager/coach with something to
 * remove. Needed because users/{uid} reads are staff-or-self only
 * (firestore.rules) — a captain has no direct read access to a
 * coach/manager's account doc, only staff does (see TeamsAdminTab.tsx's
 * useAllUsers, which is exactly that staff-only path). Deliberately returns
 * only displayName, not email — unlike the staff admin view, a peer official
 * doesn't need another official's contact info to manage the roster.
 */
export const getTeamOfficialNames = onCall<GetTeamOfficialNamesRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId } = request.data;
  if (!teamId) throw new HttpsError("invalid-argument", "teamId is required.");

  if (!(await isTeamOfficialOrStaff(callerUid, teamId))) {
    throw new HttpsError("permission-denied", "Only this team's officials or staff can view this.");
  }

  const teamSnap = await db.collection(COLLECTIONS.teams).doc(teamId).get();
  const coachManagerUids: string[] = teamSnap.data()?.coachManagerUids ?? [];
  if (coachManagerUids.length === 0) return { members: [] };

  const docs = await Promise.all(coachManagerUids.map((uid) => db.collection(COLLECTIONS.users).doc(uid).get()));
  const members = docs.map((snap, i) => ({
    uid: coachManagerUids[i],
    displayName: (snap.data()?.displayName as string | undefined) ?? "Unknown",
  }));
  return { members };
});
