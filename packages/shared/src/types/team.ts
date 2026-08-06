export interface Category {
  id: string;
  label: string; // e.g. "Boys U14", "Men's Open"
  format: "9-aside" | "7-aside" | "5-aside";
  minPlayersToStart: number; // per side; 3 across all divisions
}

export interface Team {
  id: string;
  name: string;
  categoryId: string;
  color: string; // hex, used for avatar bg + schedule highlight
  group?: "A" | "B";
  sponsorId?: string;
  captainUserId?: string;
  roster: RosterEntry[];
  // Plain uid list mirroring roster, kept in sync by a Cloud Function
  // trigger — lets Firestore rules check roster membership (e.g. for
  // teamChannels reads) without being able to filter roster's objects.
  rosterUids?: string[];
  // Aggregate stats, recomputed by a Cloud Function trigger whenever a game
  // in this category is set to "final". Never written directly by clients.
  stats: TeamStats;
}

export interface RosterEntry {
  // The account's Firebase Auth uid — kept as the real uid (NOT unique per
  // child; every sibling on a shared family account has the same one) since
  // team-membership/permission checks (team channels, onRoster gates) match
  // this against request.auth.uid. Never use this to disambiguate one child
  // from their siblings — use playerKey for that.
  userId: string;
  /**
   * Unique per registered child (an Outreach profileId, falling back to
   * their own registration row id) — unlike userId, this is NEVER shared
   * across siblings on one family account. Use this for anything that must
   * pick out one specific kid: check-in, Moments tagging, jersey-number
   * edits. Optional only because older/seed roster entries predate this
   * field; every entry built from registration data always sets it.
   */
  playerKey?: string;
  displayName: string;
  jerseyNumber?: number;
  position?: string;
  isCaptain: boolean;
  checkInStatus: CheckInStatus;
  selfieUrl?: string;
  badges?: string[]; // e.g. "Player of the Match", "Rising Star"
  /** Both optional, self-reported at check-in — absent unless the player chose to share them. */
  lineOfWork?: string;
  currentEmployer?: string;
}

export type CheckInStatus =
  | "not_started"
  | "pending_review"
  | "approved"
  | "rejected"
  | "admin_review";

export interface TeamStats {
  wins: number;
  draws: number;
  losses: number;
  points: number; // win=3, draw=1, loss=0
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number; // += goals scored, -= goals conceded, per final/forfeited game score
  groupRank?: number;
}
