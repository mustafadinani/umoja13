import { pickPrimaryRole, type Role } from "./roles.js";
import type { PlayerMembership, UserProfile } from "./user.js";
import type { RegisteredPlayer } from "./registration.js";
import { resolvePlayerCategoryId } from "../registration/mapRegistration.js";

/**
 * Loose shape for `(default)/profiles/{uid}` docs from the Outreach app.
 * Field names vary by vintage; the mapper tolerates several aliases.
 */
export interface OutreachProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  fullName?: string;
  name?: string;
  photoUrl?: string;
  profilePicture?: string;
  photoURL?: string;
  phone?: string;
  roles?: Role[];
  primaryRole?: Role;
  /** Doc id in `(default)/families/{familyId}` when this profile belongs to a household. */
  family?: string;
}

function displayNameFromOutreach(raw: OutreachProfile, fallbackEmail?: string): string {
  if (raw.displayName?.trim()) return raw.displayName.trim();
  if (raw.fullName?.trim()) return raw.fullName.trim();
  if (raw.name?.trim()) return raw.name.trim();
  const combined = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return fallbackEmail?.split("@")[0] || "Player";
}

/**
 * Build the `playerOf` memberships for `uid` from their registration rows —
 * the piece of mapOutreachProfileToUserProfile that's also needed on its
 * own: useResolvedProfile calls this directly to enrich an existing
 * `users/{uid}` doc that already has real registrations under this uid but
 * was created without them (e.g. a parent who used the app's own Sign Up
 * form with the same uid Outreach later — or already — matched their
 * playersRegistered rows to). Without this, that account's own bare
 * `{roles, primaryRole}` doc permanently wins over the richer registration
 * data the instant it exists, so their kids/teams never show up anywhere.
 */
export function playerMembershipsFromRegisteredPlayers(
  uid: string,
  players: RegisteredPlayer[],
  /**
   * teamId -> that team's registered captain identity (captainProfileId,
   * falling back to the team's own uid — same precedence mapRegistration.ts
   * uses for Team.roster[].isCaptain). Without this, every Outreach-derived
   * profile hardcoded isCaptain: false, so a real captain signing in through
   * their normal registration account never saw "Captain Tools" at all —
   * only an account an admin had separately role-granted "captain" through
   * setUserRole (a different, unrelated mechanism) would. Callers build this
   * from the same RegisteredTeam docs they already have on hand (see
   * useResolvedProfile.ts / buildBaseProfileFromOutreach).
   */
  teamCaptainByTeamId: Map<string, string | undefined> = new Map(),
  /**
   * teamId -> the set of playerKeys a coach/manager (or staff) has appointed
   * as captain on that team (see RosterCheckIn.appointedCaptain /
   * assignTeamOfficial) — additive to teamCaptainByTeamId's real registration
   * captain, and keyed by playerKey (not uid) since two siblings sharing one
   * account need to be distinguishable here the same way RosterEntry.isCaptain
   * already is in registeredPlayerToRosterEntry.
   */
  appointedCaptainKeysByTeamId: Map<string, Set<string>> = new Map()
): PlayerMembership[] {
  return players
    .filter((p) => p.uid === uid || p.id === uid)
    .map((p) => ({
      teamId: p.teamId,
      categoryId: resolvePlayerCategoryId(p),
      isCaptain: (() => {
        const captainId = teamCaptainByTeamId.get(p.teamId);
        const playerUid = p.uid || p.id;
        if (captainId && playerUid === captainId) return true;
        const playerKey = p.profileId?.trim() || p.id;
        return !!appointedCaptainKeysByTeamId.get(p.teamId)?.has(playerKey);
      })(),
      // Omit rather than set `undefined` when there's no registration photo —
      // every caller of this mapper eventually spreads its result straight
      // into a Firestore write, and both the Admin and client SDKs reject an
      // explicit `undefined` field value outright (a real player with no
      // photo on file threw "INTERNAL" out of reviewVolunteerApplication,
      // silently stranding their application in "pending" forever).
      ...(p.profilePicture ? { registrationPhotoUrl: p.profilePicture } : {}),
      playerName: `${p.firstName} ${p.lastName}`.trim(),
      // Prefer explicit profileId; otherwise the playersRegistered doc id is often the profile id.
      profileId: p.profileId?.trim() || p.id,
    }));
}

/** Map an Outreach `(default)/profiles/{uid}` doc into the app's UserProfile. */
export function mapOutreachProfileToUserProfile(
  uid: string,
  raw: OutreachProfile,
  players: RegisteredPlayer[] = [],
  teamCaptainByTeamId: Map<string, string | undefined> = new Map(),
  appointedCaptainKeysByTeamId: Map<string, Set<string>> = new Map()
): UserProfile {
  const now = Date.now();
  const playerOf = playerMembershipsFromRegisteredPlayers(uid, players, teamCaptainByTeamId, appointedCaptainKeysByTeamId);

  const roles: Role[] =
    raw.roles && raw.roles.length > 0
      ? raw.roles
      : playerOf.length > 0
        ? ["player"]
        : ["fan"];

  const photoUrl = raw.photoUrl || raw.profilePicture || raw.photoURL;

  return {
    uid,
    email: raw.email ?? "",
    displayName: displayNameFromOutreach(raw, raw.email),
    ...(photoUrl ? { photoUrl } : {}),
    roles,
    // roles[0] used to be the fallback here — order-dependent and exactly
    // how a plain "fan" ended up outranking "player" for real registered
    // families (see PRIMARY_ROLE_PRIORITY's comment). pickPrimaryRole is
    // the same auto-derivation logic every other automatic role change uses.
    primaryRole: raw.primaryRole && roles.includes(raw.primaryRole) ? raw.primaryRole : pickPrimaryRole(roles),
    ...(playerOf.length > 0 ? { playerOf } : {}),
    followedTeamIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
