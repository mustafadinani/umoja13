import { useMemo, useState } from "react";
import { CATEGORIES, FIELDS, type Game } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useGames, useTeams } from "../../../hooks/useData";
import { Card, Pill, PrimaryButton, StatusBadge } from "../../../components/ui";
import { AddGameModal } from "./AddGameModal";
import { GameDetailModal } from "./GameDetailModal";

export function AllGamesTab() {
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const [search, setSearch] = useState("");
  const [field, setField] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailGame, setDetailGame] = useState<Game | null>(null);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const filtered = games.filter((g) => {
    if (field && g.field !== field) return false;
    if (search) {
      const home = teamById.get(g.homeTeamId)?.name ?? "";
      const away = teamById.get(g.awayTeamId)?.name ?? "";
      const q = search.toLowerCase();
      if (!home.toLowerCase().includes(q) && !away.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          placeholder="Search by team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        <PrimaryButton onClick={() => setAddOpen(true)}>+ ADD GAME</PrimaryButton>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!field} onClick={() => setField(null)}>All fields</Pill>
        {FIELDS.map((f) => <Pill key={f} active={field === f} onClick={() => setField(f)}>{f}</Pill>)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((g) => {
          const home = teamById.get(g.homeTeamId);
          const away = teamById.get(g.awayTeamId);
          return (
            <Card key={g.id} onClick={() => setDetailGame(g)} data-testid="admin-game-row" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{home?.name ?? "TBD"} vs {away?.name ?? "TBD"}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {CATEGORIES.find((c) => c.id === g.categoryId)?.label} · {g.field} · {g.day.toUpperCase()} {g.kickoffTime}
                  {!g.refereeUid && <span style={{ color: theme.color.warning, fontWeight: 700 }}> · No ref assigned</span>}
                </div>
              </div>
              <StatusBadge status={g.status} />
            </Card>
          );
        })}
        {filtered.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No games match.</div>}
      </div>

      {addOpen && <AddGameModal onClose={() => setAddOpen(false)} />}
      {detailGame && <GameDetailModal game={detailGame} onClose={() => setDetailGame(null)} />}
    </div>
  );
}
