import { TOURNAMENT_DAY_ISO_DATE, TOURNAMENT_START_AT } from "../constants/categories.js";

export type GameStatus = "scheduled" | "live" | "final" | "forfeited";

export type GameEventType = "yellow_card" | "red_card";

export interface GameEvent {
  id: string;
  type: GameEventType;
  teamId: string;
  /** RosterEntry.playerKey — never the bare account uid, which every sibling on one family account shares. */
  playerId: string;
  playerNumber: number;
  minute: number;
  createdAt: number;
  createdBy: string; // referee uid
}

export interface GoalScorerEvent {
  id: string;
  teamId: string;
  /** RosterEntry.playerKey — never the bare account uid, which every sibling on one family account shares. */
  playerId: string;
  playerNumber: number;
  minute: number;
  createdAt: number;
  createdBy: string; // referee uid
}

/**
 * Who scored each goal — lives in its OWN collection (gameScorers/{gameId}),
 * never as a field on the Game doc itself. games has `allow read: if true`
 * (needed so anyone can see live scores without an account), and Firestore
 * security rules are enforced per-document, not per-field — so anything
 * stored inside a Game doc is downloadable by anyone regardless of what the
 * app's UI chooses to show. This collection gets its own, tighter read rule
 * (staff + the assigned referee only) instead.
 */
export interface GameScorers {
  id: string; // == gameId
  gameId: string;
  scorers: GoalScorerEvent[];
  updatedAt: number;
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

/** Round shape used across every division's bracket — see BracketTemplateId (types/team.ts) and BRACKET_TEMPLATES (constants/bracketTemplates.ts) for which rounds a given division actually uses (e.g. Girls U10 has no wildcard/qf/sf at all). */
export type GameRound = "group" | "wildcard" | "qf" | "sf" | "final";

/** Which parallel bracket track a playoff game belongs to. Every division's SF/wildcard rounds feed a single Cup/Shield split at the Final round — undefined until then. Men's Open is the one division with two fully parallel tracks (Cup vs Classic) starting from the QF, so `bracket` is set from the QF onward there. Always undefined for `round: "group"`. */
export type GameBracket = "cup" | "shield" | "classic";

/**
 * How a playoff game's participant is determined before it's knowable as a
 * concrete team id. "seed" means the division's final group-stage standing
 * (Team.stats.groupRank once every group game is final/forfeited) — distinct
 * from a group-stage game's `home/awayDrawPos`, which is the *draw* position
 * fixed by the published schedule, not a standing. "winner"/"loser" resolve
 * once the named `matchCode` game itself is final/forfeited.
 */
export type TeamRef =
  | { type: "seed"; seed: number }
  | { type: "winner"; matchCode: string }
  | { type: "loser"; matchCode: string };

export interface Game {
  id: string;
  categoryId: string;
  day: "fri" | "sat" | "sun";
  kickoffTime: string; // "10:40"
  field: string; // "12B" — see GAME_FIELDS in constants/categories.ts for the venue's actual sub-pitch codes
  /** Derived from `field` at creation via podForField(pods, fieldCluster(field)) — lets a Pod Hub show its games without a fields<->pod join at read time. */
  podId?: string;
  /**
   * Real team doc ids once known — "" until resolved. For a group-stage game
   * that's until the division's Live Draw runs (see `homeDrawPos`/
   * `awayDrawPos`); for a playoff game it's until `homeRef`/`awayRef`
   * resolves. Existing UI (Schedule/Standings) already renders a lookup miss
   * as "TBD", so "" is a safe placeholder with no extra handling required.
   */
  homeTeamId: string;
  awayTeamId: string;
  /** Group-stage only: 1-indexed draw position ("Team N" in the published schedule) — fixed by the schedule regardless of which real team the Live Draw assigns to it. Undefined for playoff games, which use homeRef/awayRef instead. */
  homeDrawPos?: number;
  awayDrawPos?: number;
  /** Playoff games only (round !== "group"): how to resolve this side once its prerequisite is known. Cleared once resolved (homeTeamId/awayTeamId become the source of truth from then on, like any other game). */
  homeRef?: TeamRef;
  awayRef?: TeamRef;
  status: GameStatus;
  round: GameRound;
  /** Which parallel bracket this game belongs to — see GameBracket. */
  bracket?: GameBracket;
  /** Slot label for playoff games so later rounds can reference "winner of X" concretely, e.g. "SF1", "QF3", "Wildcard", "CupFinal" — see TeamRef. Undefined for group games (draw position is identifier enough). */
  matchCode?: string;
  /** Zero, one, or more — some games (finals, higher-stakes matches) run with two referees rather than one. Anyone in this list has the same gate-check/match-console/game-card access. */
  refereeUids?: string[];
  gateCheck: {
    completedAt?: number;
    completedBy?: string;
    /** RosterEntry.playerKey values — never the bare account uid, which every sibling on one family account shares. */
    homeClearedUids: string[];
    awayClearedUids: string[];
  };
  events: GameEvent[];
  /** Referee-entered running score — no per-player goal attribution, just the count. Defaults to 0 until the referee taps a +. */
  homeScore?: number;
  awayScore?: number;
  /** Referee's single combined Man of the Match, across both rosters — a RosterEntry.playerKey, not the bare account uid. */
  motmUserId?: string;
  /** Separate fan-facing "Player of the Match" popularity vote — one vote per fan, distinct from motmUserId. */
  potmVotes?: Record<string /* userId of voting fan */, string /* playerId voted for */>;
  forfeit?: ForfeitRecord;
  gameCard?: GameCard;
  createdAt: number;
  updatedAt: number;
}

/** Real chronological day order — the "fri" < "sat" < "sun" string-sort trick some screens use happens to match this tournament's actual days, but only by coincidence; this is the version that doesn't depend on that. */
export const DAY_ORDER: Record<Game["day"], number> = { fri: 0, sat: 1, sun: 2 };

/** Chronological order: day, then kickoff time. For a straight schedule list. */
export function compareGamesByKickoff(a: Game, b: Game): number {
  return DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.kickoffTime.localeCompare(b.kickoffTime);
}

/** Chronological order for anything with a day + 24-hour "HH:MM" time — Games and Toddler Camp sessions share this shape, so one merged schedule can sort both the same way. */
export function compareByDayAndTime(a: { day: Game["day"]; time: string }, b: { day: Game["day"]; time: string }): number {
  return DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.time.localeCompare(b.time);
}

/** Live games first, then chronological — for a "what's on now" feed where live matters more than kickoff order. */
export function compareGamesLiveFirst(a: Game, b: Game): number {
  if ((a.status === "live") !== (b.status === "live")) return a.status === "live" ? -1 : 1;
  return compareGamesByKickoff(a, b);
}

/** "16:30" -> "4:30 PM" — every kickoff time is stored 24-hour ("HH:MM"), formatted 12-hour for display. */
export function formatKickoffTime(time: string): string {
  const [hStr, m] = time.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** Absolute epoch ms for a game's kickoff — combines Game.day/kickoffTime with the tournament's known calendar dates (TOURNAMENT_DAY_ISO_DATE), same America/New_York convention TOURNAMENT_START_AT itself was built with. A Game only ever stores day+time relative to that shared calendar, never an absolute instant of its own. */
export function gameKickoffAt(day: Game["day"], kickoffTime: string): number {
  return new Date(`${TOURNAMENT_DAY_ISO_DATE[day]}T${kickoffTime}:00-04:00`).getTime();
}

/**
 * When jersey numbers lock for one team in one category: the kickoff of that
 * team's own earliest scheduled game (home or away) in `games`, so a team
 * that doesn't play until the afternoon keeps editing rights that much
 * longer than one that opens at 8:30 AM. Falls back to the tournament-wide
 * TOURNAMENT_START_AT for a team/category with no scheduled game yet (its
 * bracket/draw hasn't run) — so a team is never left unlocked indefinitely
 * just because its schedule isn't posted.
 */
export function jerseyLockAt(games: Game[], teamId: string, categoryId: string): number {
  const relevant = games.filter((g) => g.categoryId === categoryId && (g.homeTeamId === teamId || g.awayTeamId === teamId));
  if (relevant.length === 0) return TOURNAMENT_START_AT;
  return Math.min(...relevant.map((g) => gameKickoffAt(g.day, g.kickoffTime)));
}

/** "CupQF1" -> "Cup QF1", "ShieldFinal" -> "Shield Final", "Wildcard" -> "Wild Card" — for referencing another game in copy ("Winner of X"). */
export function formatMatchCode(matchCode: string): string {
  if (matchCode === "Wildcard") return "Wild Card";
  return matchCode.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/**
 * Human label for one side of a game that doesn't have a real team assigned
 * yet — "Team 4" (draw position, group stage), "Seed 1", "Winner of Wild
 * Card", "Loser of SF1" — or null once resolved (callers should show the
 * real team name instead, same as they already do). Takes the raw fields
 * rather than a full Game so it works for either side without a
 * home/away-specific overload.
 */
export function provisionalSideLabel(drawPos: number | undefined, ref: TeamRef | undefined): string | null {
  if (drawPos != null) return `Team ${drawPos}`;
  if (!ref) return null;
  if (ref.type === "seed") return `Seed ${ref.seed}`;
  const verb = ref.type === "winner" ? "Winner" : "Loser";
  return `${verb} of ${formatMatchCode(ref.matchCode)}`;
}

export interface PlayerGameStats {
  gamesPlayed: number;
  yellowCards: number;
  redCards: number;
  motmCount: number;
}

/**
 * Tournament-wide totals for one player on one team, computed by scanning
 * whatever `games` list the caller already has loaded (e.g. from useGames())
 * — there's no standing aggregate for any of these four numbers anywhere in
 * the data model, so this is always a live reduce, never a stored field.
 * "Games played" means the referee actually cleared this player at the gate
 * for that specific game (Game.gateCheck), not just an approved check-in —
 * check-in is a one-time identity verification per category, unrelated to
 * per-game attendance.
 *
 * `playerKey` — pass RosterEntry.playerKey (falling back to userId only for
 * legacy data written before it existed), never the bare account uid on its
 * own: gateCheck/events/motmUserId are all keyed by playerKey precisely so
 * two siblings sharing one family account never share a game record.
 */
export function computePlayerGameStats(games: Game[], teamId: string, playerKey: string): PlayerGameStats {
  const stats: PlayerGameStats = { gamesPlayed: 0, yellowCards: 0, redCards: 0, motmCount: 0 };
  for (const g of games) {
    const onHome = g.homeTeamId === teamId;
    const onAway = g.awayTeamId === teamId;
    if (!onHome && !onAway) continue;

    const clearedUids = onHome ? g.gateCheck.homeClearedUids : g.gateCheck.awayClearedUids;
    if (clearedUids.includes(playerKey)) stats.gamesPlayed++;

    for (const e of g.events) {
      if (e.playerId !== playerKey) continue;
      if (e.type === "yellow_card") stats.yellowCards++;
      else if (e.type === "red_card") stats.redCards++;
    }

    if (g.motmUserId === playerKey) stats.motmCount++;
  }
  return stats;
}

export type SuspensionReason = "red_card" | "two_yellows_one_game" | "accumulated_yellows";

export interface PlayerSuspensionStatus {
  suspended: boolean;
  reason?: SuspensionReason;
}

/** Human label for a SuspensionReason — the one copy shown wherever a suspension flag appears. */
export function suspensionReasonLabel(reason: SuspensionReason): string {
  switch (reason) {
    case "red_card":
      return "Red card";
    case "two_yellows_one_game":
      return "2 yellow cards in one game";
    case "accumulated_yellows":
      return "3 accumulated yellow cards";
  }
}

/**
 * Whether a player should be flagged suspended for their NEXT game, per
 * TOURNAMENT_RULES.cardsAndDiscipline (constants/rules.ts): a red card, or
 * 2+ yellows in one game, means an immediate one-game suspension; separately,
 * crossing every 3rd cumulative yellow card (no reset — cards keep
 * accumulating for the whole tournament in this category) also triggers one.
 *
 * Same "recompute, don't incrementally patch" philosophy as
 * computePlayerGameStats above — a pure function over whatever `games` list
 * the caller already has loaded, no stored suspension ledger anywhere. Scoped
 * by teamId (not a separate categoryId param) since a team belongs to
 * exactly one category — a player who plays up in a second category is on a
 * different team there, so this naturally never conflates the two.
 *
 * Deliberately advisory only: this flags a player, it never blocks a
 * referee/commissioner from clearing them anyway — the organizers want a
 * human to keep the final call (committee overrides, disputed calls, etc).
 */
export function computePlayerSuspension(games: Game[], teamId: string, playerKey: string): PlayerSuspensionStatus {
  const relevant = games
    // Only games that have actually happened — a future "scheduled" game on
    // the calendar has no card events yet, and folding it into this scan
    // would wrongly reset a live suspension back to `false` (the loop below
    // sets `latest` from every game it sees, so an empty upcoming game must
    // never be treated as "cleared it, no new violation").
    .filter((g) => (g.homeTeamId === teamId || g.awayTeamId === teamId) && g.status !== "scheduled")
    .sort(compareGamesByKickoff);

  let cumulativeYellows = 0;
  let latest: PlayerSuspensionStatus = { suspended: false };
  for (const g of relevant) {
    const playerEvents = g.events.filter((e) => e.playerId === playerKey);
    const yellowsThisGame = playerEvents.filter((e) => e.type === "yellow_card").length;
    const hadRed = playerEvents.some((e) => e.type === "red_card");
    const priorCumulative = cumulativeYellows;
    cumulativeYellows += yellowsThisGame;

    if (hadRed) latest = { suspended: true, reason: "red_card" };
    else if (yellowsThisGame >= 2) latest = { suspended: true, reason: "two_yellows_one_game" };
    else if (Math.floor(cumulativeYellows / 3) > Math.floor(priorCumulative / 3)) latest = { suspended: true, reason: "accumulated_yellows" };
    else latest = { suspended: false };
  }
  return latest;
}
