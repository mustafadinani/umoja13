export type GameStatus = "scheduled" | "live" | "final" | "forfeited";

export type GameEventType = "yellow_card" | "red_card";

export interface GameEvent {
  id: string;
  type: GameEventType;
  teamId: string;
  playerId: string;
  playerNumber: number;
  minute: number;
  createdAt: number;
  createdBy: string; // referee uid
}

export type ForfeitOutcome = "home_win" | "away_win" | "double_no_show";

export interface ForfeitRecord {
  outcome: ForfeitOutcome;
  reason: string;
  declaredBy: string; // referee uid
  declaredAt: number;
}

export type GameCardStatus = "not_submitted" | "awaiting_commissioner" | "final";

export interface GameCard {
  photoUrl: string;
  submittedAt: number;
  submittedBy: string; // referee uid
  status: GameCardStatus;
  calledFinalBy?: string; // commissioner uid
  calledFinalAt?: number;
}

export interface Game {
  id: string;
  categoryId: string;
  day: "fri" | "sat" | "sun";
  kickoffTime: string; // "10:40"
  field: string; // "Field 12" — see FIELDS in constants/categories.ts for the venue's actual field numbering
  /** Derived from `field` at creation via podForField() — lets a Pod Hub show its games without a fields<->pod join at read time. */
  podId?: string;
  homeTeamId: string;
  awayTeamId: string;
  status: GameStatus;
  round: "group" | "qf" | "sf_ab" | "sf_cd" | "final";
  refereeUid?: string;
  gateCheck: {
    completedAt?: number;
    completedBy?: string;
    homeClearedUids: string[];
    awayClearedUids: string[];
  };
  events: GameEvent[];
  /** Referee-entered running score — no per-player goal attribution, just the count. Defaults to 0 until the referee taps a +. */
  homeScore?: number;
  awayScore?: number;
  /** Referee's single combined Man of the Match, across both rosters. */
  motmUserId?: string;
  /** Separate fan-facing "Player of the Match" popularity vote — one vote per fan, distinct from motmUserId. */
  potmVotes?: Record<string /* userId of voting fan */, string /* playerId voted for */>;
  forfeit?: ForfeitRecord;
  gameCard?: GameCard;
  createdAt: number;
  updatedAt: number;
}

/** Real chronological day order — the "fri" < "sat" < "sun" string-sort trick some screens use happens to match this tournament's actual days, but only by coincidence; this is the version that doesn't depend on that. */
const DAY_ORDER: Record<Game["day"], number> = { fri: 0, sat: 1, sun: 2 };

/** Chronological order: day, then kickoff time. For a straight schedule list. */
export function compareGamesByKickoff(a: Game, b: Game): number {
  return DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.kickoffTime.localeCompare(b.kickoffTime);
}

/** Live games first, then chronological — for a "what's on now" feed where live matters more than kickoff order. */
export function compareGamesLiveFirst(a: Game, b: Game): number {
  if ((a.status === "live") !== (b.status === "live")) return a.status === "live" ? -1 : 1;
  return compareGamesByKickoff(a, b);
}
