import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FESTIVAL_CATEGORY_IDS } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useCategories, useGames, useTeams } from "../hooks/useData";
import { Pill, Card } from "../components/ui";

const ROUND_LABELS: Record<string, string> = {
  qf: "QUARTERFINAL",
  sf_ab: "SEMIFINAL · A/B",
  sf_cd: "SEMIFINAL · C/D",
  final: "FINAL",
};

export function Standings() {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const activeCategoryId = categoryId ?? categories[0]?.id ?? null;
  const { data: teams } = useTeams(activeCategoryId ?? undefined);
  const { data: games } = useGames();

  const isFestival = activeCategoryId ? FESTIVAL_CATEGORY_IDS.includes(activeCategoryId) : false;
  const grouped = useMemo(() => {
    const byGroup = new Map<string, typeof teams>();
    teams.forEach((t) => {
      const key = t.group ?? "A";
      byGroup.set(key, [...(byGroup.get(key) ?? []), t]);
    });
    for (const [key, list] of byGroup) {
      byGroup.set(
        key,
        [...list].sort((a, b) => (a.stats.groupRank ?? 99) - (b.stats.groupRank ?? 99))
      );
    }
    return byGroup;
  }, [teams]);

  const bracketGames = games.filter((g) => g.categoryId === activeCategoryId && g.round !== "group");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>STANDINGS & BRACKET</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {categories.map((c) => (
          <Pill key={c.id} active={activeCategoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.label}</Pill>
        ))}
      </div>

      {isFestival ? (
        <Card>
          <div style={{ fontWeight: 700 }}>Festival format — every player medals!</div>
          <div style={{ color: theme.color.textMuted, fontSize: 14, marginTop: 6 }}>
            This category doesn't track W-D-L standings or a bracket.
          </div>
        </Card>
      ) : (
        <>
          {[...grouped.entries()].map(([group, list]) => (
            <div key={group} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>GROUP {group}</div>
              <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: 10, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: theme.color.textMuted, borderBottom: `1px solid ${theme.color.border}` }}>
                  <span>#</span><span>TEAM</span><span>W-D-L</span><span>GF</span><span>GD</span><span>PTS</span>
                </div>
                {list.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/team/${t.id}`)}
                    style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: 10, padding: "12px 14px", fontSize: 14, cursor: "pointer", borderBottom: i < list.length - 1 ? `1px solid #F4F2F8` : undefined, background: i < 2 ? "#FBF8FF" : undefined }}
                  >
                    <span style={{ fontWeight: 700 }}>{t.stats.groupRank ?? i + 1}</span>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span>{t.stats.wins}-{t.stats.draws}-{t.stats.losses}</span>
                    <span>{t.stats.goalsFor}</span>
                    <span>{t.stats.goalDiff >= 0 ? "+" : ""}{t.stats.goalDiff}</span>
                    <span style={{ fontWeight: 800 }}>{t.stats.points}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>ROAD TO SUNDAY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bracketGames.map((g) => (
                <div
                  key={g.id}
                  onClick={() => navigate(`/game/${g.id}`)}
                  style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.color.textMuted }}>{ROUND_LABELS[g.round] ?? g.round.toUpperCase()}</span>
                  <span style={{ fontWeight: 600 }}>{g.field} · {g.kickoffTime}</span>
                </div>
              ))}
              {bracketGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Bracket games are seeded once group play wraps up.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
