export type GameStatus = "scheduled" | "live" | "final" | "forfeited";

export type GameEventType = "goal" | "yellow_card" | "red_card";

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
  field: string; // "Field 1"
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
  /** Referee's single combined Man of the Match, across both rosters. */
  motmUserId?: string;
  /** Separate fan-facing "Player of the Match" popularity vote — one vote per fan, distinct from motmUserId. */
  potmVotes?: Record<string /* userId of voting fan */, string /* playerId voted for */>;
  forfeit?: ForfeitRecord;
  gameCard?: GameCard;
  createdAt: number;
  updatedAt: number;
}
