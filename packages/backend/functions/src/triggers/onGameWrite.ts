import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { COLLECTIONS, FESTIVAL_CATEGORY_IDS, type Game, type TeamStats } from "@umoja/shared";
import { db, FIRESTORE_DATABASE_ID } from "../util/admin.js";

function emptyStats(): TeamStats {
  return { wins: 0, draws: 0, losses: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 };
}

/**
 * Recomputes both teams' aggregate stats whenever a game in their category
 * becomes final/forfeited (or is un-finalized). Standings are always
 * derived, never hand-edited — this is the single writer of Team.stats.
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
    if (g.forfeit) {
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
    if (g.forfeit?.outcome === "double_no_show") continue;

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
  await batch.commit();
});
