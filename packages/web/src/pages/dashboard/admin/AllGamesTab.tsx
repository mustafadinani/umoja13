import { useMemo, useState } from "react";
import { CATEGORIES, GAME_FIELDS, compareGamesByKickoff, formatKickoffTime } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useGames, useTeams } from "../../../hooks/useData";
import { Card, FilterDropdown, PrimaryButton, StatusBadge } from "../../../components/ui";
import { AddGameModal } from "./AddGameModal";
import { GameDetailModal } from "./GameDetailModal";

const FIELD_OPTIONS = GAME_FIELDS.map((f) => ({ id: f, label: f }));

export function AllGamesTab() {
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const [search, setSearch] = useState("");
  const [field, setField] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Track just the id, not the Game object itself — a frozen object snapshot
  // from click-time never picked up any of GameDetailModal's own edits (or
  // anyone else's), so every save silently "worked" in Firestore while the
  // open modal kept showing the pre-edit value, looking exactly like nothing
  // saved. Deriving the game fresh from the live `games` list every render
  // means the modal re-renders with real data the moment its own writes
  // (or another tab's) land.
  const [detailGameId, setDetailGameId] = useState<string | null>(null);
  const detailGame = detailGameId ? games.find((g) => g.id === detailGameId) ?? null : null;

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const filtered = games
    .filter((g) => {
      if (field && g.field !== field) return false;
      if (search) {
        const home = teamById.get(g.homeTeamId)?.name ?? "";
        const away = teamById.get(g.awayTeamId)?.name ?? "";
        const q = search.toLowerCase();
        if (!home.toLowerCase().includes(q) && !away.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort(compareGamesByKickoff);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search by team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 160, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        <FilterDropdown label="Field" value={field} options={FIELD_OPTIONS} onChange={setField} />
        <PrimaryButton onClick={() => setAddOpen(true)}>+ ADD GAME</PrimaryButton>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((g) => {
          const home = teamById.get(g.homeTeamId);
          const away = teamById.get(g.awayTeamId);
          return (
            <Card key={g.id} onClick={() => setDetailGameId(g.id)} data-testid="admin-game-row" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{home?.name ?? "TBD"} vs {away?.name ?? "TBD"}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {CATEGORIES.find((c) => c.id === g.categoryId)?.label} · {g.field} · {g.day.toUpperCase()} {formatKickoffTime(g.kickoffTime)}
                  {(g.refereeUids ?? []).length === 0 && <span style={{ color: theme.color.warning, fontWeight: 700 }}> · No ref assigned</span>}
                  {(g.refereeUids ?? []).length > 1 && <span style={{ color: theme.color.textMuted }}> · {g.refereeUids?.length} refs</span>}
                </div>
              </div>
              <StatusBadge status={g.status} />
            </Card>
          );
        })}
        {filtered.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No games match.</div>}
      </div>

      {addOpen && <AddGameModal onClose={() => setAddOpen(false)} />}
      {detailGame && <GameDetailModal game={detailGame} onClose={() => setDetailGameId(null)} />}
    </div>
  );
}
