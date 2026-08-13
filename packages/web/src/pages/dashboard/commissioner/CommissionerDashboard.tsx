import { useState } from "react";
import { where } from "firebase/firestore";
import { CATEGORIES } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useGames, useIncidents, useTeam } from "../../../hooks/useData";
import { callItFinal } from "../../../lib/callables";
import { Card, IncidentStatusPill, Pill, PrimaryButton } from "../../../components/ui";
import { IncidentReplyModal } from "../../../components/IncidentReplyModal";
import { GameCardPhotoModal } from "../../../components/GameCardPhotoModal";
import { MyPodTasksSection } from "../../../components/MyPodTasksSection";
import { AllGamesTab } from "../admin/AllGamesTab";

type CommissionerTab = "gameCards" | "complaints" | "games";
const TABS: { id: CommissionerTab; label: string }[] = [
  { id: "gameCards", label: "Game Cards" },
  { id: "complaints", label: "Complaints" },
  { id: "games", label: "Games" },
];

/**
 * A commissioner's own three jobs — game cards to finalize, complaints/
 * incidents to work, and the schedule (where the printable Game Card and
 * score/card edits live). Deliberately NOT the full admin tab set: a
 * commissioner doesn't manage Teams/Players/Volunteers/Sponsors/Users/etc.
 * day to day, and stacking all of that here just meant endless vertical
 * scrolling to get back to the two things they actually check constantly.
 */
export function CommissionerDashboard() {
  const { data: awaitingGames } = useGames([where("gameCard.status", "==", "awaiting_commissioner")]);
  const { data: incidents } = useIncidents();
  const [tab, setTab] = useState<CommissionerTab>("gameCards");
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [cardPhotoUrl, setCardPhotoUrl] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  const openIncident = incidents.find((i) => i.id === openIncidentId) ?? null;
  const pendingIncidents = incidents.filter((i) => i.status !== "resolved" && i.status !== "denied").length;

  async function finalize(gameId: string) {
    setFinalizing(gameId);
    setFinalizeError(null);
    try {
      await callItFinal({ gameId });
    } catch (e) {
      setFinalizeError(e instanceof Error ? e.message : "Couldn't call this game final.");
    } finally {
      setFinalizing(null);
    }
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
          {finalizeError && (
            <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              {finalizeError}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {awaitingGames.map((g) => (
              <FinalizeRow key={g.id} homeTeamId={g.homeTeamId} awayTeamId={g.awayTeamId} motmUserId={g.motmUserId}
                homeScore={g.homeScore ?? 0} awayScore={g.awayScore ?? 0} cardPhotoUrl={g.gameCard?.photoUrl}
                onViewCard={(url) => setCardPhotoUrl(url)}
                onFinalize={() => finalize(g.id)}
                busy={finalizing === g.id}
              />
            ))}
            {awaitingGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Nothing waiting on you right now.</div>}
          </div>
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
      {cardPhotoUrl && <GameCardPhotoModal url={cardPhotoUrl} onClose={() => setCardPhotoUrl(null)} />}
    </div>
  );
}

function sourceIcon(source: string): string {
  return { captain_complaint: "📝", referee_flag: "🚩", forfeit: "🚩", fan_message: "💬", volunteer_message: "🙋" }[source] ?? "•";
}

function FinalizeRow({
  homeTeamId, awayTeamId, motmUserId, homeScore, awayScore, cardPhotoUrl, onViewCard, onFinalize, busy,
}: {
  homeTeamId: string; awayTeamId: string; motmUserId?: string;
  homeScore: number; awayScore: number; cardPhotoUrl?: string;
  onViewCard: (url: string) => void; onFinalize: () => void; busy: boolean;
}) {
  const { data: home } = useTeam(homeTeamId);
  const { data: away } = useTeam(awayTeamId);
  if (!home || !away) return null;
  const homeGoals = homeScore;
  const awayGoals = awayScore;
  const motmPlayer = [...home.roster, ...away.roster].find((p) => (p.playerKey ?? p.userId) === motmUserId);

  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 700 }}>{home.name} {homeGoals}–{awayGoals} {away.name}</div>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>
            {CATEGORIES.find((c) => c.id === home.categoryId)?.label} {motmPlayer && `· Player of the Game: ${motmPlayer.displayName}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cardPhotoUrl && (
            <button onClick={() => onViewCard(cardPhotoUrl)} style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}>
              View card photo
            </button>
          )}
          <PrimaryButton onClick={onFinalize} disabled={busy}>{busy ? "…" : "CALL IT FINAL"}</PrimaryButton>
        </div>
      </div>
    </Card>
  );
}
