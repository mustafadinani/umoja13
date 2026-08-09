import { CATEGORIES } from "../constants/categories.js";
import { BRACKET_TEMPLATES } from "../constants/bracketTemplates.js";
import type { Game, GameBracket } from "./game.js";

/** Individual, nominated-by-staff awards — one MVP/Best Young Player/Best Goalkeeper per category. */
export const PLAYER_AWARD_TYPES = ["mvp", "best_young_player", "best_goalkeeper"] as const;
export type PlayerAwardType = (typeof PLAYER_AWARD_TYPES)[number];

export const PLAYER_AWARD_LABELS: Record<PlayerAwardType, string> = {
  mvp: "Most Valuable Player",
  best_young_player: "Best Young Player",
  best_goalkeeper: "Best Goalkeeper",
};

export const PLAYER_AWARD_ICONS: Record<PlayerAwardType, string> = {
  mvp: "🏆",
  best_young_player: "🌟",
  best_goalkeeper: "🧤",
};

/** A staff pick is 3 nominees + one starred winner among them — no more, no fewer. */
export const MAX_PLAYER_AWARD_NOMINEES = 3;

/** Whole-team awards — auto-computed from each category's actual bracket Final, not nominated. */
export const TEAM_AWARD_TYPES = ["cup_winner", "cup_runner_up", "shield_winner", "classic_winner"] as const;
export type TeamAwardType = (typeof TEAM_AWARD_TYPES)[number];

export const TEAM_AWARD_LABELS: Record<TeamAwardType, string> = {
  cup_winner: "Cup Winner",
  cup_runner_up: "Cup Runner-Up",
  shield_winner: "Shield Winner",
  classic_winner: "Classic Winner",
};

export const TEAM_AWARD_ICONS: Record<TeamAwardType, string> = {
  cup_winner: "🏆",
  cup_runner_up: "🥈",
  shield_winner: "🛡️",
  classic_winner: "🎖️",
};

/** Which bracket + which side of that bracket's Final each team award reads off. */
const TEAM_AWARD_SOURCE: Record<TeamAwardType, { bracket: GameBracket; finish: "winner" | "runner_up" }> = {
  cup_winner: { bracket: "cup", finish: "winner" },
  cup_runner_up: { bracket: "cup", finish: "runner_up" },
  shield_winner: { bracket: "shield", finish: "winner" },
  classic_winner: { bracket: "classic", finish: "winner" },
};

export interface PlayerAwardNominee {
  playerKey: string;
  name: string;
  teamId: string;
  teamName: string;
}

export interface PlayerAwardSlot {
  nominees: PlayerAwardNominee[];
  /** A PlayerAwardNominee.playerKey from the nominees array above. */
  winnerPlayerKey?: string;
}

export interface TeamAwardOverride {
  teamId: string;
  teamName: string;
}

/** One doc per category — id == categoryId. */
export interface CategoryAwards {
  categoryId: string;
  player: Partial<Record<PlayerAwardType, PlayerAwardSlot>>;
  /**
   * Manual correction for a team award that would otherwise be auto-computed
   * from the actual Final result (forfeit, scoring dispute, data-entry fix).
   * Absent for an award means "use the computed value" — this is a rare
   * override, not the normal path.
   */
  teamOverrides?: Partial<Record<TeamAwardType, TeamAwardOverride>>;
  updatedAt: number;
}

/**
 * Whether this category's bracket shape even produces the named team award —
 * Classic only exists for Men's Open (the one division with a parallel
 * bracket); Men's 40 & Over's 3-team template has no Shield Final at all.
 * Derived from BRACKET_TEMPLATES rather than hand-listed per category, so a
 * future template change can't silently drift out of sync with this.
 */
export function categoryHasTeamAward(categoryId: string, awardType: TeamAwardType): boolean {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return false;
  const { bracket } = TEAM_AWARD_SOURCE[awardType];
  return BRACKET_TEMPLATES[category.bracketTemplate].some((g) => g.round === "final" && g.bracket === bracket);
}

export interface ResolvedTeamAward {
  teamId: string;
  /** True when this came from a manual teamOverrides entry rather than the actual Final's score. */
  overridden: boolean;
}

/**
 * Auto-computes a team award from the category's actual Final game — the one
 * game matching this award's bracket + round:"final" — reading the winner/
 * runner-up straight off the score (or forfeit outcome) once that game is
 * final/forfeited. Returns undefined until that specific game exists and is
 * decided (or is a double no-show, which decides nothing). A manual override
 * always takes precedence over the computed result.
 */
export function resolveTeamAward(
  games: Game[],
  categoryId: string,
  awardType: TeamAwardType,
  override?: TeamAwardOverride
): ResolvedTeamAward | undefined {
  if (override) return { teamId: override.teamId, overridden: true };

  const { bracket, finish } = TEAM_AWARD_SOURCE[awardType];
  const final = games.find((g) => g.categoryId === categoryId && g.round === "final" && g.bracket === bracket);
  if (!final || (final.status !== "final" && final.status !== "forfeited")) return undefined;
  if (!final.homeTeamId || !final.awayTeamId) return undefined;

  let winnerId: string;
  if (final.forfeit) {
    if (final.forfeit.outcome === "double_no_show") return undefined;
    winnerId = final.forfeit.outcome === "home_win" ? final.homeTeamId : final.awayTeamId;
  } else {
    const home = final.homeScore ?? 0;
    const away = final.awayScore ?? 0;
    if (home === away) return undefined; // a Final shouldn't end level, but never guess if it somehow does
    winnerId = home > away ? final.homeTeamId : final.awayTeamId;
  }
  const loserId = winnerId === final.homeTeamId ? final.awayTeamId : final.homeTeamId;
  return { teamId: finish === "winner" ? winnerId : loserId, overridden: false };
}
