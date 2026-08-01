/**
 * Legacy registration docs in Firestore `(default)` database under
 * uGames/{year}/teamsRegistered and uGames/{year}/playersRegistered.
 * Mapped into Team + RosterEntry for the tournament app UI.
 */

export const REGISTRATION_YEAR = "2026";
export const REGISTRATION_ROOT = "uGames";
export const TEAMS_REGISTERED = "teamsRegistered";
export const PLAYERS_REGISTERED = "playersRegistered";

export interface RegisteredTeam {
  id: string;
  teamName: string;
  category: string;
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
  category?: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  status?: string;
  /** Document id in teamsRegistered */
  teamId: string;
  teamName?: string;
  /** Firebase Auth uid (may be a client-generated id in older rows) */
  uid: string;
  dob?: unknown;
  centerOptOut?: boolean;
  mosque?: string | null;
  pastGames?: { city: string; selected: boolean }[];
  attestLiabilityAgreement?: boolean;
  attestParticipationAgreeement?: boolean;
  attestRefundPolicy?: boolean;
}
