export interface Category {
  id: string;
  label: string; // e.g. "Boys U14", "Men's Open"
  format: "9-aside" | "7-aside" | "5-aside";
  minPlayersToStart: number; // 6 / 5 / 3 respectively
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
  // Aggregate stats, recomputed by a Cloud Function trigger whenever a game
  // in this category is set to "final". Never written directly by clients.
  stats: TeamStats;
}

export interface RosterEntry {
  userId: string;
  displayName: string;
  jerseyNumber?: number;
  position?: string;
  isCaptain: boolean;
  goals: number;
  assists: number;
  checkInStatus: CheckInStatus;
  selfieUrl?: string;
  badges?: string[]; // e.g. "Player of the Match", "Rising Star"
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
  goalDiff: number; // += goals scored, -= goals conceded, per goal event
  groupRank?: number;
}
