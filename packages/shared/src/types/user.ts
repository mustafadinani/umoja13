import type { Role } from "./roles.js";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  /** A user can hold multiple roles (e.g. captain + referee) but has one primary role for nav. */
  roles: Role[];
  primaryRole: Role;
  /** Team memberships as a player/captain: one entry per category they play in. */
  playerOf?: PlayerMembership[];
  /** Team ids a fan follows. */
  followedTeamIds?: string[];
  /** Expo push token for the device this user last registered from (set via registerPushToken). */
  pushToken?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerMembership {
  teamId: string;
  categoryId: string;
  jerseyNumber?: number;
  isCaptain: boolean;
  /** Player's registration-time photo, used as the AI face-match baseline at check-in. */
  registrationPhotoUrl?: string;
  /**
   * The actual player's name — distinct from the signed-in account's own
   * displayName, since one parent account can hold memberships for several
   * kids. Falls back to the account's displayName for memberships created
   * before this field existed.
   */
  playerName?: string;
}
