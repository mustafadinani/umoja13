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
}
