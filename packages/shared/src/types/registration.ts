/**
 * Legacy registration docs in Firestore `(default)` database under
 * uGames/{year}/teamsRegistered and uGames/{year}/playersRegistered.
 * Mapped into Team + RosterEntry for the tournament app UI.
 */

export const REGISTRATION_YEAR = "2026";
export const REGISTRATION_ROOT = "uGames";
export const TEAMS_REGISTERED = "teamsRegistered";
export const PLAYERS_REGISTERED = "playersRegistered";

/**
 * The exact `status` string the now-removed self-serve "Join a Team" flow
 * (JoinTeamModal, mobile + web) wrote on every playersRegistered doc it
 * created. Nothing else in the app has ever written a new playersRegistered
 * doc with this literal status — the real Outreach import pipeline is a
 * separate, external process — so it's a reliable marker for "this player
 * was self-registered in-app, not vetted through Outreach," useful for
 * admins to find and clean up entries created before the flow was removed.
 */
export const SELF_REGISTERED_STATUS = "Registered. Pending Manager Review";

/**
 * The exact `status` string Outreach's own registration flow writes on a
 * playersRegistered doc for a family that started signing up but never
 * finished — no team, no category, nothing beyond name/email/phone. This is
 * a completely different situation from SELF_REGISTERED_STATUS (that's a
 * finished-but-unvetted in-app signup); this is simply an unfinished one.
 * Confirmed against production data (Aug 2026): 348 of 1230 playersRegistered
 * rows carry this status — 162 of them share a profileId with a real
 * completed registration for the same kid (they registered again properly
 * after abandoning the first attempt), and 186 have no completed counterpart
 * at all (they just never came back). Either way there's no real player here
 * to check in or place on a team, so these must be excluded the same places
 * SELF_REGISTERED_STATUS already is.
 */
export const INCOMPLETE_REGISTRATION_STATUS = "Registration In Progress";

export interface RegisteredTeam {
  id: string;
  teamName: string;
  /** Human-readable category label from Outreach (e.g. "Men's open"). */
  category: string;
  /** Canonical umoja13-app category id when set/corrected. */
  categoryId?: string;
  /** Optional pool/group assignment when present on the registration row. */
  group?: string;
  teamCaptainName?: string;
  captainProfileId?: string;
  registeredByProfileId?: string;
  email?: string;
  phone?: string;
  status?: string;
  totalRegistered?: number;
  uid?: string;
  /** Optional brand art when present on older/newer registration rows. */
  logoUrl?: string;
  teamLogo?: string;
  logo?: string;
  attestLiabilityAgreement?: boolean;
  attestParticipationAgreeement?: boolean;
  attestRefundPolicy?: boolean;
}

export interface RegisteredPlayer {
  id: string;
  firstName: string;
  lastName: string;
  /** Human-readable category label from registration (e.g. "Boy's 8 & Under"). */
  category?: string;
  /** Canonical category id from umoja13-app / categories when set/corrected. */
  categoryId?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  status?: string;
  /** Document id in teamsRegistered */
  teamId: string;
  teamName?: string;
  /** Firebase Auth uid (may be a client-generated id in older rows) */
  uid: string;
  /** Outreach profile id when present — matches `families.members[].id` / `profiles/{id}`. */
  profileId?: string;
  dob?: unknown;
  centerOptOut?: boolean;
  mosque?: string | null;
  pastGames?: { city: string; selected: boolean }[];
  attestLiabilityAgreement?: boolean;
  attestParticipationAgreeement?: boolean;
  attestRefundPolicy?: boolean;
}
