import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, FESTIVAL_CATEGORY_IDS, resolveBracketTeamRef, type Game, type TeamStats } from "@umoja/shared";
import { db, FIRESTORE_DATABASE_ID } from "../util/admin.js";

function emptyStats(): TeamStats {
  return { wins: 0, draws: 0, losses: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 };
}

/**
 * Recomputes both teams' aggregate stats whenever a game in their category
 * becomes final/forfeited (or is un-finalized), and — since that's exactly
 * the moment a division's final group-stage standing or a playoff result
 * becomes knowable — resolves as many of that category's still-unresolved
 * playoff games (round !== "group", homeTeamId/awayTeamId still "") as it
 * can in the same pass. Standings are always derived, never hand-edited —
 * this is the single writer of Team.stats.
 */
export const onGameWrite = onDocumentWritten(
  { document: `${COLLECTIONS.games}/{gameId}`, database: FIRESTORE_DATABASE_ID },
  async (event) => {
  const before = event.data?.before?.data() as Game | undefined;
  const after = event.data?.after?.data() as Game | undefined;
  const game = after ?? before;
  if (!game) return;
  if (FESTIVAL_CATEGORY_IDS.includes(game.categoryId)) return; // no standings tracked

  // Recompute every team's stats in this category from all final/forfeited games,
  // rather than incrementally patching — simpler to reason about and self-healing
  // if a score gets corrected after the fact.
  const teamsSnap = await db.collection(COLLECTIONS.teams).where("categoryId", "==", game.categoryId).get();
  const gamesSnap = await db
    .collection(COLLECTIONS.games)
    .where("categoryId", "==", game.categoryId)
    .get();

  const statsByTeam = new Map<string, TeamStats>();
  teamsSnap.docs.forEach((d) => statsByTeam.set(d.id, emptyStats()));

  for (const gdoc of gamesSnap.docs) {
    const g = gdoc.data() as Game;
    if (g.status !== "final" && g.status !== "forfeited") continue;

    let homeGoals: number;
    let awayGoals: number;
    // Branch on g.status, not on g.forfeit's mere presence — a game whose
    // status was reverted back off "forfeited" (e.g. staff correcting a
    // mistaken forfeit call) can still carry a stale `forfeit` object if
    // nothing ever clears it, and a truthy-check here would then score a
    // legitimately-played, properly-finalized 0-0 game as a 5-0 forfeit
    // result instead of the real draw.
    if (g.status === "forfeited" && g.forfeit) {
      homeGoals = g.forfeit.outcome === "home_win" ? 5 : g.forfeit.outcome === "away_win" ? 0 : 0;
      awayGoals = g.forfeit.outcome === "away_win" ? 5 : g.forfeit.outcome === "home_win" ? 0 : 0;
    } else {
      // Referee-entered directly (no per-player goal events anymore).
      homeGoals = g.homeScore ?? 0;
      awayGoals = g.awayScore ?? 0;
    }

    const home = statsByTeam.get(g.homeTeamId);
    const away = statsByTeam.get(g.awayTeamId);
    if (!home || !away) continue;

    // Double no-show: no points, no W/D/L, no GF/GA recorded per the official rules.
    if (g.status === "forfeited" && g.forfeit?.outcome === "double_no_show") continue;

    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (homeGoals < awayGoals) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const stats of statsByTeam.values()) {
    stats.goalDiff = stats.goalsFor - stats.goalsAgainst;
  }

  // Apply any standings-points penalty (rule infringement, etc.) — see
  // Team.pointsPenalty's doc comment. Folded in here, after the raw
  // game-by-game tally and before ranking, so it survives every future
  // recompute instead of being an edit to stats.points that the next game
  // write in this category would silently wipe. Goal difference/goals-for
  // are left untouched — only points move, same as how league point
  // deductions are conventionally applied.
  for (const teamDoc of teamsSnap.docs) {
    const penalty = (teamDoc.data() as { pointsPenalty?: number }).pointsPenalty;
    if (!penalty) continue;
    const stats = statsByTeam.get(teamDoc.id);
    if (stats) stats.points -= penalty;
  }

  const ranked = [...statsByTeam.entries()].sort(([, a], [, b]) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
  ranked.forEach(([, stats], i) => {
    stats.groupRank = i + 1;
  });

  const batch = db.batch();
  for (const teamDoc of teamsSnap.docs) {
    const stats = statsByTeam.get(teamDoc.id);
    if (!stats) continue;
    batch.set(teamDoc.ref, { stats }, { merge: true });
  }

  // ---- Bracket resolution ----
  // matchCode -> who actually won/lost, from every playoff game in this
  // category that's already final/forfeited (a double no-show has neither —
  // per the official rules "neither team advances in knockout stages" — so
  // it permanently blocks anything depending on it until an organizer
  // manually intervenes, same as a same-score final that somehow wasn't
  // shot out). Built once per pass from gamesSnap, which already reflects
  // this event's own write since triggers fire post-commit.
  const matchCodeResults = new Map<string, { winnerId?: string; loserId?: string }>();
  for (const gdoc of gamesSnap.docs) {
    const g = gdoc.data() as Game;
    if (!g.matchCode || (g.status !== "final" && g.status !== "forfeited")) continue;
    if (g.status === "forfeited" && g.forfeit?.outcome === "double_no_show") continue;
    let winnerId: string | undefined;
    let loserId: string | undefined;
    // Same g.status guard as the stats loop above — a stale g.forfeit object
    // left over from a reverted forfeit call must not be read as live.
    if (g.status === "forfeited" && g.forfeit) {
      winnerId = g.forfeit.outcome === "home_win" ? g.homeTeamId : g.awayTeamId;
      loserId = g.forfeit.outcome === "home_win" ? g.awayTeamId : g.homeTeamId;
    } else {
      const home = g.homeScore ?? 0;
      const away = g.awayScore ?? 0;
      if (home === away) continue; // shouldn't happen for a finalized knockout game (shootout already resolves ties) — skip rather than guess
      winnerId = home > away ? g.homeTeamId : g.awayTeamId;
      loserId = home > away ? g.awayTeamId : g.homeTeamId;
    }
    matchCodeResults.set(g.matchCode, { winnerId, loserId });
  }

  // A division's "seed" (final group-stage standing) is only knowable once
  // every one of its group/league games is done — ranked[] above is exactly
  // that computation, already run unconditionally regardless of round.
  const groupGames = gamesSnap.docs.map((d) => d.data() as Game).filter((g) => g.round === "group");
  const groupStageComplete = groupGames.length > 0 && groupGames.every((g) => g.status === "final" || g.status === "forfeited");
  const seedToTeamId = (seedNum: number): string | undefined => (groupStageComplete ? ranked[seedNum - 1]?.[0] : undefined);

  for (const gdoc of gamesSnap.docs) {
    const g = gdoc.data() as Game;
    if (g.round === "group") continue;
    const updates: Record<string, unknown> = {};
    if (!g.homeTeamId && g.homeRef) {
      const id = resolveBracketTeamRef(g.homeRef, seedToTeamId, (mc) => matchCodeResults.get(mc));
      if (id) { updates.homeTeamId = id; updates.homeRef = FieldValue.delete(); }
    }
    if (!g.awayTeamId && g.awayRef) {
      const id = resolveBracketTeamRef(g.awayRef, seedToTeamId, (mc) => matchCodeResults.get(mc));
      if (id) { updates.awayTeamId = id; updates.awayRef = FieldValue.delete(); }
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      batch.update(gdoc.ref, updates);
    }
  }

  await batch.commit();
});
