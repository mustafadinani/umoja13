import { useParams, useNavigate } from "react-router-dom";
import { theme } from "../lib/theme";
import { useCategories, useGames, useTeam } from "../hooks/useData";
import { Card, StatusBadge } from "../components/ui";

export function Team() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { data: team } = useTeam(teamId);
  const { data: categories } = useCategories();
  const { data: games } = useGames();

  if (!team) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;

  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 48px" }}>
      <div style={{ background: `linear-gradient(120deg, ${team.color}, ${theme.color.pink})`, color: "#fff", padding: 24 }}>
        <div onClick={() => navigate(-1)} style={{ fontSize: 13, opacity: 0.85, cursor: "pointer", marginBottom: 10 }}>‹ Back</div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32 }}>{team.name}</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4 }}>
          {categories.find((c) => c.id === team.categoryId)?.label ?? team.categoryId} · Group {team.group ?? "—"} · Rank #{team.stats.groupRank ?? "—"}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 13.5, fontWeight: 600 }}>
          <span>{team.stats.wins}W-{team.stats.draws}D-{team.stats.losses}L</span>
          <span>GD {team.stats.goalDiff >= 0 ? "+" : ""}{team.stats.goalDiff}</span>
          <span>{team.stats.points} PTS</span>
        </div>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>ROSTER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {team.roster.map((p) => (
              <Card key={p.userId} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16, color: theme.color.textMuted }}>#{p.jerseyNumber ?? "—"}</span>
                  <span style={{ fontWeight: 600 }}>{p.displayName}{p.isCaptain && " (C)"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>
                  {p.goals}G {p.assists}A ·{" "}
                  <span style={{ fontWeight: 700, color: p.checkInStatus === "approved" ? theme.color.success : theme.color.warning }}>
                    {p.checkInStatus === "approved" ? "Cleared" : p.checkInStatus === "pending_review" ? "Pending" : p.checkInStatus}
                  </span>
                </div>
              </Card>
            ))}
            {team.roster.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Roster not published yet.</div>}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>SCHEDULE & RESULTS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {teamGames.map((g) => (
              <Card key={g.id} onClick={() => navigate(`/game/${g.id}`)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5 }}>{g.day.toUpperCase()} · {g.field}</span>
                <StatusBadge status={g.status} />
              </Card>
            ))}
            {teamGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No games scheduled yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
