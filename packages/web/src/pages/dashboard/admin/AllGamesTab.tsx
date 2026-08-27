import { useMemo, useState } from "react";
import { CATEGORIES, GAME_FIELDS, TOURNAMENT_DAY_DATES, compareGamesByKickoff, formatKickoffTime, type Game } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useGames, useTeams } from "../../../hooks/useData";
import { Card, FilterDropdown, PrimaryButton, StatusBadge } from "../../../components/ui";
import { GameCardReviewModal } from "../../../components/GameCardReviewModal";
import { AddGameModal } from "./AddGameModal";
import { GameDetailModal } from "./GameDetailModal";

/** Opens the printable Game Card page for these games in a new tab — see PrintGameCards.tsx. */
function openPrintGameCards(gameIds: string[]) {
  if (gameIds.length === 0) return;
  window.open(`/print/game-cards?ids=${gameIds.join(",")}`, "_blank", "noopener");
}

const FIELD_OPTIONS = GAME_FIELDS.map((f) => ({ id: f, label: f }));
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ id: c.id, label: c.label }));
const DAY_OPTIONS: { id: Game["day"]; label: string }[] = [
  { id: "fri", label: `Fri, ${TOURNAMENT_DAY_DATES.fri}` },
  { id: "sat", label: `Sat, ${TOURNAMENT_DAY_DATES.sat}` },
  { id: "sun", label: `Sun, ${TOURNAMENT_DAY_DATES.sun}` },
];

export function AllGamesTab() {
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const [search, setSearch] = useState("");
  const [day, setDay] = useState<Game["day"] | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
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
  const [reviewGameId, setReviewGameId] = useState<string | null>(null);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  // Sits above the filtered/searched list below regardless of whatever
  // filters are active — a card waiting on a decision shouldn't disappear
  // just because someone's mid-search for something else.
  const awaitingGames = useMemo(
    () => games.filter((g) => g.gameCard?.status === "awaiting_commissioner").sort(compareGamesByKickoff),
    [games]
  );

  const filtered = games
    .filter((g) => {
      if (day && g.day !== day) return false;
      if (field && g.field !== field) return false;
      if (categoryId && g.categoryId !== categoryId) return false;
      if (search) {
        const home = teamById.get(g.homeTeamId)?.name ?? "";
        const away = teamById.get(g.awayTeamId)?.name ?? "";
        const category = CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? "";
        const q = search.toLowerCase();
        if (
          !home.toLowerCase().includes(q) &&
          !away.toLowerCase().includes(q) &&
          !category.toLowerCase().includes(q) &&
          !g.field.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    })
    .sort(compareGamesByKickoff);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search by team, category, or field…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 160, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        <FilterDropdown<Game["day"]> label="Day" value={day} options={DAY_OPTIONS} onChange={setDay} />
        <FilterDropdown label="Category" value={categoryId} options={CATEGORY_OPTIONS} onChange={setCategoryId} />
        <FilterDropdown label="Field" value={field} options={FIELD_OPTIONS} onChange={setField} />
        <button
          onClick={() => openPrintGameCards(filtered.map((g) => g.id))}
          disabled={filtered.length === 0}
          style={{
            background: "none", border: `1px solid ${theme.color.border}`, color: theme.color.navy, borderRadius: theme.radius.sm,
            padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: filtered.length === 0 ? "default" : "pointer",
            opacity: filtered.length === 0 ? 0.5 : 1, whiteSpace: "nowrap",
          }}
        >
          🖨 Print {filtered.length} game card{filtered.length === 1 ? "" : "s"}
        </button>
        <PrimaryButton onClick={() => setAddOpen(true)}>+ ADD GAME</PrimaryButton>
      </div>

      {awaitingGames.length > 0 && (
        <div style={{ border: `1.5px solid ${theme.color.warning}`, background: theme.color.warningBg, borderRadius: theme.radius.lg, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16, color: theme.color.warning, marginBottom: 10 }}>
            ⏳ Game cards awaiting your review ({awaitingGames.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {awaitingGames.map((g) => {
              const home = teamById.get(g.homeTeamId);
              const away = teamById.get(g.awayTeamId);
              return (
                <Card key={g.id} onClick={() => setReviewGameId(g.id)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, cursor: "pointer", borderColor: theme.color.warning }}>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{home?.name ?? "TBD"} {g.homeScore ?? 0}–{g.awayScore ?? 0} {away?.name ?? "TBD"}</div>
                    <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                      {CATEGORIES.find((c) => c.id === g.categoryId)?.label} · {g.field} · {g.day.toUpperCase()} {formatKickoffTime(g.kickoffTime)}
                      {g.gameCard?.submittedAt && ` · submitted ${new Date(g.gameCard.submittedAt).toLocaleTimeString()}`}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setReviewGameId(g.id); }}
                    style={{ background: theme.color.purple, color: "#fff", border: "none", borderRadius: theme.radius.sm, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                  >
                    Review →
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((g) => {
          const home = teamById.get(g.homeTeamId);
          const away = teamById.get(g.awayTeamId);
          const cardStatus = g.gameCard?.status ?? "not_submitted";
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {cardStatus === "final" && (
                  <>
                    <span style={{ background: theme.color.successBg, color: theme.color.success, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999 }}>Card final</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setReviewGameId(g.id); }}
                      style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      View card →
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); openPrintGameCards([g.id]); }}
                  style={{ background: "#F1EFF5", color: theme.color.purple, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  🖨 Print
                </button>
                <StatusBadge status={g.status} />
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No games match.</div>}
      </div>

      {addOpen && <AddGameModal onClose={() => setAddOpen(false)} />}
      {detailGame && <GameDetailModal game={detailGame} onClose={() => setDetailGameId(null)} />}
      {reviewGameId && <GameCardReviewModal gameId={reviewGameId} onClose={() => setReviewGameId(null)} />}
    </div>
  );
}
