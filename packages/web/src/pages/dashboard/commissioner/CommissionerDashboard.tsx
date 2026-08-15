import { useMemo, useState } from "react";
import { compareGamesByKickoff, formatKickoffTime, TOURNAMENT_DAY_DATES, type Game } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useCategories, useGames, useIncidents, useTeams } from "../../../hooks/useData";
import { Card, IncidentStatusPill, Pill } from "../../../components/ui";
import { IncidentReplyModal } from "../../../components/IncidentReplyModal";
import { GameCardReviewModal } from "../../../components/GameCardReviewModal";
import { MyPodTasksSection } from "../../../components/MyPodTasksSection";
import { AllGamesTab } from "../admin/AllGamesTab";

type CommissionerTab = "gameCards" | "complaints" | "games";
const TABS: { id: CommissionerTab; label: string }[] = [
  { id: "gameCards", label: "Game Cards" },
  { id: "complaints", label: "Complaints" },
  { id: "games", label: "Games" },
];

/** Opens the printable Game Card page for one game in a new tab — see PrintGameCards.tsx. */
function openPrintGameCards(gameIds: string[]) {
  if (gameIds.length === 0) return;
  window.open(`/print/game-cards?ids=${gameIds.join(",")}`, "_blank", "noopener");
}

/**
 * A commissioner's own three jobs — game cards to finalize, complaints/
 * incidents to work, and the schedule (where the printable Game Card and
 * score/card edits live). Deliberately NOT the full admin tab set: a
 * commissioner doesn't manage Teams/Players/Volunteers/Sponsors/Users/etc.
 * day to day, and stacking all of that here just meant endless vertical
 * scrolling to get back to the two things they actually check constantly.
 *
 * "Game Cards" is one consolidated list rather than a separate print flow
 * and a separate review flow: what a row does depends entirely on where
 * that game's card actually is — no card yet → print the blank one; a card
 * is in → review it (photo next to the digital record, so a mismatch is
 * something you can actually see); already final → look back at the same
 * side-by-side view, read-only. Cards awaiting review get their own section
 * up top, ahead of everything else, since that's the one queue that's
 * actually time-sensitive.
 */
export function CommissionerDashboard() {
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const { data: categories } = useCategories();
  const { data: incidents } = useIncidents();
  const [tab, setTab] = useState<CommissionerTab>("gameCards");
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [openGameId, setOpenGameId] = useState<string | null>(null);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const realGames = useMemo(() => games.filter((g) => g.homeTeamId && g.awayTeamId), [games]);
  const awaitingGames = useMemo(
    () => realGames.filter((g) => g.gameCard?.status === "awaiting_commissioner").sort(compareGamesByKickoff),
    [realGames]
  );
  // Everything else — grouped by category so the list reads the same way
  // Standings/the Games tab already do, not a flat 200+-row wall.
  const gamesByCategory = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const g of realGames) {
      if (g.gameCard?.status === "awaiting_commissioner") continue; // already covered above
      const catId = teamById.get(g.homeTeamId)?.categoryId ?? teamById.get(g.awayTeamId)?.categoryId;
      if (!catId) continue;
      const list = map.get(catId) ?? [];
      list.push(g);
      map.set(catId, list);
    }
    for (const list of map.values()) list.sort(compareGamesByKickoff);
    return map;
  }, [realGames, teamById]);

  const openIncident = incidents.find((i) => i.id === openIncidentId) ?? null;
  const pendingIncidents = incidents.filter((i) => i.status !== "resolved" && i.status !== "denied").length;

  function gameRow(g: Game, { emphasize }: { emphasize?: boolean } = {}) {
    const home = teamById.get(g.homeTeamId);
    const away = teamById.get(g.awayTeamId);
    const status = g.gameCard?.status ?? "not_submitted";
    const played = g.status !== "scheduled";
    return (
      <Card
        key={g.id}
        onClick={() => (status === "not_submitted" ? openPrintGameCards([g.id]) : setOpenGameId(g.id))}
        style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, cursor: "pointer", borderColor: emphasize ? theme.color.warning : undefined }}
      >
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
            {home?.name ?? "TBD"} {played ? `${g.homeScore ?? 0}–${g.awayScore ?? 0}` : "vs"} {away?.name ?? "TBD"}
          </div>
          <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
            {g.field} · {g.day.toUpperCase()} {TOURNAMENT_DAY_DATES[g.day]} · {formatKickoffTime(g.kickoffTime)}
            {status === "awaiting_commissioner" && g.gameCard?.submittedAt && ` · submitted ${new Date(g.gameCard.submittedAt).toLocaleTimeString()}`}
          </div>
        </div>
        {status === "awaiting_commissioner" ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOpenGameId(g.id); }}
            style={{ background: theme.color.purple, color: "#fff", border: "none", borderRadius: theme.radius.sm, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Review →
          </button>
        ) : status === "final" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: theme.color.successBg, color: theme.color.success, fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 999 }}>Final</span>
            <button
              onClick={(e) => { e.stopPropagation(); setOpenGameId(g.id); }}
              style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              View →
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); openPrintGameCards([g.id]); }}
            style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            🖨 Print
          </button>
        )}
      </Card>
    );
  }

  return (
    <div className="page-shell" style={{ maxWidth: 1000 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>COMMISSIONER DESK</div>

      <MyPodTasksSection />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "gameCards" && awaitingGames.length > 0 && ` (${awaitingGames.length})`}
            {t.id === "complaints" && pendingIncidents > 0 && ` (${pendingIncidents})`}
          </Pill>
        ))}
      </div>

      {tab === "gameCards" && (
        <>
          {awaitingGames.length > 0 && (
            <div style={{ border: `1.5px solid ${theme.color.warning}`, background: theme.color.warningBg, borderRadius: theme.radius.lg, padding: 16, marginBottom: 26 }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16, color: theme.color.warning, marginBottom: 10 }}>
                ⏳ Awaiting your review ({awaitingGames.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {awaitingGames.map((g) => gameRow(g, { emphasize: true }))}
              </div>
            </div>
          )}

          {categories
            .filter((c) => (gamesByCategory.get(c.id)?.length ?? 0) > 0)
            .map((c) => (
              <div key={c.id}>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, letterSpacing: 0.3, color: theme.color.textMuted, textTransform: "uppercase", margin: "18px 0 10px" }}>
                  {c.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(gamesByCategory.get(c.id) ?? []).map((g) => gameRow(g))}
                </div>
              </div>
            ))}

          {awaitingGames.length === 0 && gamesByCategory.size === 0 && (
            <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No games on the schedule yet.</div>
          )}
        </>
      )}

      {tab === "complaints" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {incidents.map((i) => (
            <Card key={i.id} onClick={() => setOpenIncidentId(i.id)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {sourceIcon(i.source)} {i.filedByName} — {i.source.replace("_", " ")}
                </div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>#{i.caseNumber} · {i.text.slice(0, 80)}</div>
              </div>
              <IncidentStatusPill status={i.status} />
            </Card>
          ))}
          {incidents.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Nothing here.</div>}
        </div>
      )}

      {tab === "games" && <AllGamesTab />}

      {openIncident && <IncidentReplyModal incident={openIncident} onClose={() => setOpenIncidentId(null)} />}
      {openGameId && <GameCardReviewModal gameId={openGameId} onClose={() => setOpenGameId(null)} />}
    </div>
  );
}

function sourceIcon(source: string): string {
  return { captain_complaint: "📝", referee_flag: "🚩", forfeit: "🚩", fan_message: "💬", volunteer_message: "🙋" }[source] ?? "•";
}
