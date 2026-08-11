import type { Role } from "./roles.js";
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
  teamCaptainByTeamId: Map<string, string | undefined> = new Map()
): PlayerMembership[] {
  return players
    .filter((p) => p.uid === uid || p.id === uid)
    .map((p) => ({
      teamId: p.teamId,
      categoryId: resolvePlayerCategoryId(p),
      isCaptain: (() => {
        const captainId = teamCaptainByTeamId.get(p.teamId);
        if (!captainId) return false;
        const playerUid = p.uid || p.id;
        return playerUid === captainId;
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
  teamCaptainByTeamId: Map<string, string | undefined> = new Map()
): UserProfile {
  const now = Date.now();
  const playerOf = playerMembershipsFromRegisteredPlayers(uid, players, teamCaptainByTeamId);

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
    primaryRole: raw.primaryRole && roles.includes(raw.primaryRole) ? raw.primaryRole : roles[0],
    ...(playerOf.length > 0 ? { playerOf } : {}),
    followedTeamIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
