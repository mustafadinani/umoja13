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
import { ADMIN_TABS, type AdminTab } from "../admin/adminTabs";
import { AllGamesTab } from "../admin/AllGamesTab";
import { TeamsAdminTab } from "../admin/TeamsAdminTab";
import { LiveDrawTab } from "../admin/LiveDrawTab";
import { CheckInsTab } from "../admin/CheckInsTab";
import { PlayersAdminTab } from "../admin/PlayersAdminTab";
import { ModerationOpsTab } from "../admin/ModerationOpsTab";
import { HuntAdminTab } from "../admin/HuntAdminTab";
import { VolunteersTab } from "../admin/VolunteersTab";
import { SponsorsAdminTab } from "../admin/SponsorsAdminTab";
import { NotificationsAdminTab } from "../admin/NotificationsAdminTab";
import { TeamChannelsAdminTab } from "../admin/TeamChannelsAdminTab";
import { UserChannelsAdminTab } from "../admin/UserChannelsAdminTab";
import { PodsAdminTab } from "../admin/PodsAdminTab";
import { UsersAdminTab } from "../admin/UsersAdminTab";
import { AwardsAdminTab } from "../admin/AwardsAdminTab";

export function CommissionerDashboard() {
  const { data: awaitingGames } = useGames([where("gameCard.status", "==", "awaiting_commissioner")]);
  const { data: incidents } = useIncidents();
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [cardPhotoUrl, setCardPhotoUrl] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  // Everything past the Desk (finalize queue + incidents) below is the exact
  // same admin tab set AdminDashboard has — the backend already treats
  // commissioner as full staff everywhere, this just stops the UI from being
  // the one place that didn't.
  const [tab, setTab] = useState<AdminTab>("games");

  const openIncident = incidents.find((i) => i.id === openIncidentId) ?? null;

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

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>GAME CARDS TO FINALIZE</div>
      {finalizeError && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          {finalizeError}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
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

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>NEEDS YOUR ATTENTION</div>
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

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10, marginTop: 28 }}>
        EVERYTHING ELSE
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {ADMIN_TABS.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>
        ))}
      </div>
      {tab === "games" && <AllGamesTab />}
      {tab === "teams" && <TeamsAdminTab />}
      {tab === "liveDraw" && <LiveDrawTab />}
      {tab === "players" && <PlayersAdminTab />}
      {tab === "checkins" && <CheckInsTab />}
      {tab === "ops" && <ModerationOpsTab />}
      {tab === "hunt" && <HuntAdminTab />}
      {tab === "volunteers" && <VolunteersTab />}
      {tab === "sponsors" && <SponsorsAdminTab />}
      {tab === "notifications" && <NotificationsAdminTab />}
      {tab === "teamChannels" && <TeamChannelsAdminTab />}
      {tab === "messages" && <UserChannelsAdminTab />}
      {tab === "pods" && <PodsAdminTab />}
      {tab === "users" && <UsersAdminTab />}
      {tab === "awards" && <AwardsAdminTab />}

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
