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
  /**
   * Web Push subscription for the browser this user last enabled
   * notifications from (set via registerWebPushSubscription) — the
   * browser-native equivalent of pushToken above, for anyone using the site
   * itself rather than the mobile app. Unlike an Expo token this isn't a
   * single opaque string; it's the standard PushSubscription shape a
   * browser hands back from `PushManager.subscribe()`.
   */
  webPushSubscription?: WebPushSubscription;
  createdAt: number;
  updatedAt: number;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
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
  /**
   * Outreach profile id for this player — used to match `(default)/families`
   * `members[].id` and load `(default)/profiles/{profileId}` photos.
   */
  profileId?: string;
}
