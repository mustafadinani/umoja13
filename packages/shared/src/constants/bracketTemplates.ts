import type { BracketTemplateId } from "../types/team.js";
import type { GameBracket, GameRound, TeamRef } from "../types/game.js";

/** One playoff game a bracket template produces, independent of day/time/field (those come from the published schedule — see the schedule seed data). */
export interface BracketTemplateGame {
  round: GameRound;
  bracket?: GameBracket;
  matchCode: string;
  homeRef: TeamRef;
  awayRef: TeamRef;
}

const seed = (n: number): TeamRef => ({ type: "seed", seed: n });
const winner = (matchCode: string): TeamRef => ({ type: "winner", matchCode });
const loser = (matchCode: string): TeamRef => ({ type: "loser", matchCode });

/**
 * Round-by-round definitions for the 7 bracket shapes used across the 11
 * Umoja13 divisions, transcribed from the Aug 2026 Schedule & Format Guide's
 * "Full Match Schedule" (not just its prose "Road to the Final" summaries —
 * those are the source of truth for game *counts*, but the actual Sunday
 * schedule rows are the source of truth for how each round resolves).
 *
 * `seed` refs mean the division's final group-stage standing (Team.stats
 * .groupRank once every group game is final/forfeited) — see
 * resolveBracketTeamRef. `winner`/`loser` refs resolve once the named
 * matchCode game itself is final/forfeited.
 *
 * Two normalizations from the literal PDF text, both because the printed
 * label doesn't match the division's own prose rule or its own semis:
 * - Boys U8 and Boys U14 print every playoff row with a stray "SF1:" prefix,
 *   including their Cup/Shield Finals — the actual matchup text ("Winner
 *   SF1 vs Winner SF2" / "Loser SF1 v Loser SF2") is unambiguous, so that's
 *   what's encoded here, not the copy-pasted label.
 * - Women's Open's Sunday finals print "Seed 1 vs Seed 2 (Cup Final)" and
 *   "Seed 3 vs Seed 4 (Shield Final)" even though its own semis (uniquely
 *   scheduled Saturday, not Sunday) can produce upsets — those numbers can't
 *   be taken literally without contradicting the format guide's own prose
 *   ("Semi-Final winners advance to the Cup Final; Semi-Final losers advance
 *   to the Shield Final"). Encoded here as winner/loser of the semis, per
 *   the prose rule, not the loose seed-number label.
 */
export const BRACKET_TEMPLATES: Record<BracketTemplateId, BracketTemplateGame[]> = {
  // Girls U10: double RR, no semis at all — straight from final standing to a final.
  top2_bottom2: [
    { round: "final", bracket: "cup", matchCode: "CupFinal", homeRef: seed(1), awayRef: seed(2) },
    { round: "final", bracket: "shield", matchCode: "ShieldFinal", homeRef: seed(3), awayRef: seed(4) },
  ],

  // Girls U14, Boys U10, Boys U17: seeds 1-3 auto-SF, 4v5 wildcard fills the 4th SF spot.
  seed3_wildcard: [
    { round: "wildcard", matchCode: "Wildcard", homeRef: seed(4), awayRef: seed(5) },
    { round: "sf", matchCode: "SF1", homeRef: seed(2), awayRef: seed(3) },
    { round: "sf", matchCode: "SF2", homeRef: seed(1), awayRef: winner("Wildcard") },
    { round: "final", bracket: "cup", matchCode: "CupFinal", homeRef: winner("SF1"), awayRef: winner("SF2") },
    { round: "final", bracket: "shield", matchCode: "ShieldFinal", homeRef: loser("SF1"), awayRef: loser("SF2") },
  ],

  // Boys U8, Boys U14, Women's Open: seeds 1-4 -> SF (1v4, 2v3) -> Cup/Shield Final.
  top4_semis: [
    { round: "sf", matchCode: "SF1", homeRef: seed(1), awayRef: seed(4) },
    { round: "sf", matchCode: "SF2", homeRef: seed(2), awayRef: seed(3) },
    { round: "final", bracket: "cup", matchCode: "CupFinal", homeRef: winner("SF1"), awayRef: winner("SF2") },
    { round: "final", bracket: "shield", matchCode: "ShieldFinal", homeRef: loser("SF1"), awayRef: loser("SF2") },
  ],

  // Boys U12, Men's O30: 8 teams (a partial "max 5 games" league, not a full round robin) seeded straight into QF.
  quarterfinal8: [
    { round: "qf", matchCode: "QF1", homeRef: seed(1), awayRef: seed(8) },
    { round: "qf", matchCode: "QF2", homeRef: seed(4), awayRef: seed(5) },
    { round: "qf", matchCode: "QF3", homeRef: seed(2), awayRef: seed(7) },
    { round: "qf", matchCode: "QF4", homeRef: seed(3), awayRef: seed(6) },
    { round: "sf", matchCode: "SF1", homeRef: winner("QF1"), awayRef: winner("QF2") },
    { round: "sf", matchCode: "SF2", homeRef: winner("QF3"), awayRef: winner("QF4") },
    { round: "final", bracket: "cup", matchCode: "CupFinal", homeRef: winner("SF1"), awayRef: winner("SF2") },
    { round: "final", bracket: "shield", matchCode: "ShieldFinal", homeRef: loser("SF1"), awayRef: loser("SF2") },
  ],

  // Men's Open: seeds 1-8 run a Cup bracket, seeds 9-16 run a fully parallel Classic bracket.
  // matchCodes are bracket-qualified (CupQF1 vs ClassicQF1) since both brackets reuse QF1-4/SF1-2.
  dual_bracket_16: [
    { round: "qf", bracket: "cup", matchCode: "CupQF1", homeRef: seed(1), awayRef: seed(8) },
    { round: "qf", bracket: "cup", matchCode: "CupQF2", homeRef: seed(4), awayRef: seed(5) },
    { round: "qf", bracket: "cup", matchCode: "CupQF3", homeRef: seed(2), awayRef: seed(7) },
    { round: "qf", bracket: "cup", matchCode: "CupQF4", homeRef: seed(3), awayRef: seed(6) },
    { round: "sf", bracket: "cup", matchCode: "CupSF1", homeRef: winner("CupQF1"), awayRef: winner("CupQF2") },
    { round: "sf", bracket: "cup", matchCode: "CupSF2", homeRef: winner("CupQF3"), awayRef: winner("CupQF4") },
    { round: "final", bracket: "cup", matchCode: "CupFinal", homeRef: winner("CupSF1"), awayRef: winner("CupSF2") },
    { round: "final", bracket: "shield", matchCode: "ShieldFinal", homeRef: loser("CupSF1"), awayRef: loser("CupSF2") },

    { round: "qf", bracket: "classic", matchCode: "ClassicQF1", homeRef: seed(9), awayRef: seed(16) },
    { round: "qf", bracket: "classic", matchCode: "ClassicQF2", homeRef: seed(12), awayRef: seed(13) },
    { round: "qf", bracket: "classic", matchCode: "ClassicQF3", homeRef: seed(10), awayRef: seed(15) },
    { round: "qf", bracket: "classic", matchCode: "ClassicQF4", homeRef: seed(11), awayRef: seed(14) },
    { round: "sf", bracket: "classic", matchCode: "ClassicSF1", homeRef: winner("ClassicQF1"), awayRef: winner("ClassicQF2") },
    { round: "sf", bracket: "classic", matchCode: "ClassicSF2", homeRef: winner("ClassicQF3"), awayRef: winner("ClassicQF4") },
    { round: "final", bracket: "classic", matchCode: "ClassicFinal", homeRef: winner("ClassicSF1"), awayRef: winner("ClassicSF2") },
  ],

  // Men's O40 (3 teams, double RR): seed 1 byes to the Cup Final, 2v3 play in for the other spot. No Shield Final.
  seed1_bye_playin: [
    { round: "sf", matchCode: "SF1", homeRef: seed(2), awayRef: seed(3) },
    { round: "final", bracket: "cup", matchCode: "CupFinal", homeRef: seed(1), awayRef: winner("SF1") },
  ],
};

/**
 * Resolves a single TeamRef into a real team id, or undefined if its
 * prerequisite isn't known yet. Used by both the bracket-resolution Cloud
 * Function (as games finalize) and anything that wants to preview a
 * not-yet-resolved matchup.
 *
 * `seedToTeamId` should map a division's final group-stage standing (1-indexed,
 * Team.stats.groupRank) to a team id — undefined until every group/league game
 * in that division is final/forfeited. `resolvedByMatchCode` should map a
 * playoff game's matchCode to its finalized { winnerId, loserId } — undefined
 * until that specific game is final/forfeited (or resolved as a double no-show,
 * which has no winner/loser and permanently blocks anything depending on it).
 */
export function resolveBracketTeamRef(
  ref: TeamRef,
  seedToTeamId: (seed: number) => string | undefined,
  resolvedByMatchCode: (matchCode: string) => { winnerId?: string; loserId?: string } | undefined
): string | undefined {
  if (ref.type === "seed") return seedToTeamId(ref.seed);
  const resolved = resolvedByMatchCode(ref.matchCode);
  if (!resolved) return undefined;
  return ref.type === "winner" ? resolved.winnerId : resolved.loserId;
}
