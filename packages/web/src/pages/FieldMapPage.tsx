import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGames, useTeams } from "../hooks/useData";
import { Card, Pill, StatusBadge } from "../components/ui";
import { FieldMap } from "../components/FieldMap";

type StatusFilter = "all" | "live";

/** The full-page version of the Game Day field map — bigger map, a legend, search, and a live "on now & next" feed, filterable by field. */
export function FieldMapPage() {
  const navigate = useNavigate();
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const liveCount = games.filter((g) => g.status === "live").length;

  const feed = games
    .filter((g) => g.status === "live" || g.status === "scheduled")
    .filter((g) => !selectedField || g.field === selectedField)
    .filter((g) => statusFilter !== "live" || g.status === "live")
    .filter((g) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const home = teamById.get(g.homeTeamId)?.name ?? "";
      const away = teamById.get(g.awayTeamId)?.name ?? "";
      return home.toLowerCase().includes(q) || away.toLowerCase().includes(q) || g.field.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      return (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime);
    });

  return (
    <div className="page-shell">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>FIELD MAP</div>
      <div style={{ color: theme.color.textMuted, fontSize: 14, marginBottom: 20 }}>
        Maryland SoccerPlex · tap a field to see what's playing on it
      </div>

      <div className="grid-2">
        <Card>
          <FieldMap games={games} selectedField={selectedField} onSelectField={setSelectedField} large />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 14, fontSize: 12, color: theme.color.textMuted }}>
            <LegendDot color={theme.color.success} label="Field" />
            <LegendDot color={theme.color.pink} label="Live now" pulsing />
            <LegendDot color={theme.color.purple} label="Selected" />
          </div>
          {selectedField && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <Pill active onClick={() => setSelectedField(null)}>Showing {selectedField} · clear ✕</Pill>
            </div>
          )}
        </Card>

        <div>
          <input
            placeholder="Search by team or field…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 14, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <Pill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</Pill>
            <Pill active={statusFilter === "live"} onClick={() => setStatusFilter("live")}>
              ● Live {liveCount > 0 ? `(${liveCount})` : ""}
            </Pill>
          </div>

          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
            <span>ON NOW &amp; NEXT</span>
            {liveCount > 0 && <span style={{ color: theme.color.danger }}>{liveCount} LIVE</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {feed.map((g) => {
              const home = teamById.get(g.homeTeamId);
              const away = teamById.get(g.awayTeamId);
              return (
                <Card key={g.id} onClick={() => navigate(`/game/${g.id}`)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{home?.name ?? "TBD"} vs {away?.name ?? "TBD"}</div>
                    <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                      {CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId} · {g.field}
                    </div>
                  </div>
                  <StatusBadge status={g.status} />
                </Card>
              );
            })}
            {feed.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5, padding: 20, textAlign: "center" }}>Nothing matches those filters.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, pulsing }: { color: string; label: string; pulsing?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", animation: pulsing ? "umPulse 1.6s infinite" : undefined }} />
      {label}
    </div>
  );
}
