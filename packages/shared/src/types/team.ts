/**
 * Which bracket shape resolves a division's group stage into Sunday's
 * playoff games — see BRACKET_TEMPLATES in constants/bracketTemplates.ts
 * for the actual round-by-round match definitions. Collapsed from the 11
 * divisions' individual "Road to the Final" rules in the Aug 2026 Umoja13
 * Schedule & Format Guide, since several divisions share an identical shape.
 */
export type BracketTemplateId =
  | "top2_bottom2" // Girls U10: double RR, top 2 -> Cup Final, bottom 2 -> Shield Final (no semis)
  | "seed3_wildcard" // Girls U14, Boys U10, Boys U17: seeds 1-3 auto-SF, 4v5 wildcard fills the 4th spot
  | "top4_semis" // Boys U8, Boys U14, Women's Open: seeds 1-4 -> SF (1v4, 2v3) -> Cup/Shield Final
  | "quarterfinal8" // Boys U12, Men's O30: 8 teams seeded straight into QF -> SF -> Cup/Shield Final
  | "dual_bracket_16" // Men's Open: seeds 1-8 -> Cup bracket, seeds 9-16 -> Classic bracket, run in parallel
  | "seed1_bye_playin"; // Men's O40: double RR (3 teams), seed 1 byes to Cup Final, 2v3 play in for the other spot

export interface Category {
  id: string;
  label: string; // e.g. "Boys U14", "Men's Open"
  format: "9-aside" | "7-aside" | "5-aside";
  minPlayersToStart: number; // per side; 3 across all divisions
  /**
   * Registered team count per the official Aug 2026 Schedule & Format Guide —
   * drives bracket-slot generation (seed numbers 1..teamCount) independent of
   * live registration timing. Live registered-team counts should match this;
   * a mismatch is a data problem worth flagging, not something to silently
   * resize the bracket around.
   */
  teamCount: number;
  /** Round-robin legs in the group stage: 1x (single) or 2x (double). */
  groupLegs: 1 | 2;
  bracketTemplate: BracketTemplateId;
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
