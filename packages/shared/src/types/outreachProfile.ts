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

/** Map an Outreach `(default)/profiles/{uid}` doc into the app's UserProfile. */
export function mapOutreachProfileToUserProfile(
  uid: string,
  raw: OutreachProfile,
  players: RegisteredPlayer[] = []
): UserProfile {
  const now = Date.now();
  const playerOf: PlayerMembership[] = players
    .filter((p) => p.uid === uid || p.id === uid)
    .map((p) => ({
      teamId: p.teamId,
      categoryId: resolvePlayerCategoryId(p),
      isCaptain: false,
      registrationPhotoUrl: p.profilePicture,
      playerName: `${p.firstName} ${p.lastName}`.trim(),
      // Prefer explicit profileId; otherwise the playersRegistered doc id is often the profile id.
      profileId: p.profileId?.trim() || p.id,
    }));

  const roles: Role[] =
    raw.roles && raw.roles.length > 0
      ? raw.roles
      : playerOf.length > 0
        ? ["player"]
        : ["fan"];

  return {
    uid,
    email: raw.email ?? "",
    displayName: displayNameFromOutreach(raw, raw.email),
    photoUrl: raw.photoUrl || raw.profilePicture || raw.photoURL,
    roles,
    primaryRole: raw.primaryRole && roles.includes(raw.primaryRole) ? raw.primaryRole : roles[0],
    playerOf: playerOf.length > 0 ? playerOf : undefined,
    followedTeamIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
