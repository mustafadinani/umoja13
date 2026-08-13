import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  channelHasUnread,
  computePlayerSuspension,
  formatKickoffTime,
  provisionalSideLabel,
  TOURNAMENT_DAY_DATES,
  type Game,
  type RosterEntry,
} from "@umoja/shared";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useCategories, useGames, useMoments, useSponsors, useTeam, useTeamChannel, useTeams } from "../hooks/useData";
import { markChannelRead, setJerseyNumber } from "../lib/callables";
import { Card, Pill, PrimaryButton, StatusBadge } from "../components/ui";
import { RosterTile } from "../components/RosterTile";
import { PlayerCardModal } from "../components/PlayerCardModal";
import { Lightbox } from "../components/Lightbox";
import { MomentUploadModal } from "../components/MomentUploadModal";
import { TeamChannelPanel } from "../components/TeamChannelPanel";
import { SponsorStrip } from "../components/SponsorStrip";

type Tab = "roster" | "schedule" | "moments" | "channel";

/** Short "SAT · AUG 15" tile label — day abbreviation always paired with its actual date. */
function dayDateLabel(day: Game["day"]) {
  return `${day.toUpperCase()} · ${TOURNAMENT_DAY_DATES[day].toUpperCase()}`;
}

export function Team() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: team, error: teamError } = useTeam(teamId);
  const { data: categories } = useCategories();
  const { data: games } = useGames();
  const { data: moments } = useMoments();
  const { data: channel } = useTeamChannel(teamId);
  const { data: sponsors } = useSponsors();
  const { data: teams } = useTeams();
  const [tab, setTab] = useState<Tab>("roster");
  const [openPlayer, setOpenPlayer] = useState<RosterEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(false);
  // Staff can fix a jersey number themselves right from this page instead of
  // having to go through the team's captain/coach-manager — same
  // admin-or-commissioner bar setJerseyNumber's backend already enforces.
  // No tournament-start lock here: this edit affordance is staff-only (see
  // isStaff below), and setJerseyNumber's backend deliberately exempts
  // staff from that cutoff — they're who'd need to fix a real conflict
  // found mid-tournament.
  const isStaff = profile?.roles?.includes("admin") || profile?.roles?.includes("commissioner");
  const [editingJerseyKey, setEditingJerseyKey] = useState<string | null>(null);
  const [jerseyDraft, setJerseyDraft] = useState("");
  const [jerseySaving, setJerseySaving] = useState(false);
  const [jerseyError, setJerseyError] = useState<string | null>(null);

  async function saveJerseyNumber(playerKey: string) {
    const num = Number(jerseyDraft);
    if (!jerseyDraft || Number.isNaN(num) || num < 0 || num > 999) return setJerseyError("Enter a valid number (0–999).");
    if (!teamId) return;
    setJerseySaving(true);
    setJerseyError(null);
    try {
      await setJerseyNumber({ teamId, playerKey, categoryId: team!.categoryId, jerseyNumber: num });
      setEditingJerseyKey(null);
    } catch (e) {
      setJerseyError(e instanceof Error ? e.message : "Couldn't save that number.");
    } finally {
      setJerseySaving(false);
    }
  }
  const channelUnread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  useEffect(() => {
    if (tab === "channel" && user && teamId) void markChannelRead({ kind: "team", id: teamId });
  }, [tab, teamId, user]);

  if (!team) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;

  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);
  // playerKey, not the bare userId — a moment tagged to one sibling on a
  // shared family account must not disappear just because it's checked
  // against the account uid every sibling shares.
  const rosterPlayerKeys = new Set(team.roster.map((p) => p.playerKey ?? p.userId));
  // Team moments plus any moment tagging a player on this roster — a fan
  // tagging just the player should still surface it here.
  const teamMoments = moments
    .filter((m) => m.teamTagIds?.includes(team.id) || m.playerTagUids?.some((uid) => rosterPlayerKeys.has(uid)))
    .sort((a, b) => b.createdAt - a.createdAt);
  const channelMessages = channel?.messages ?? [];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 48px", width: "100%" }}>
      <div style={{ background: `linear-gradient(120deg, ${team.color}, ${theme.color.pink})`, color: "#fff", padding: "20px 16px" }}>
        <div onClick={() => navigate(-1)} style={{ fontSize: 13, opacity: 0.85, cursor: "pointer", marginBottom: 10 }}>‹ Back</div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32 }}>{team.name}</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4 }}>
          {categories.find((c) => c.id === team.categoryId)?.label ?? team.categoryId} · Group {team.group ?? "—"} · Rank #{team.stats.groupRank ?? "—"}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 13.5, fontWeight: 600, flexWrap: "wrap" }}>
          <span>{team.stats.wins}W-{team.stats.draws}D-{team.stats.losses}L</span>
          <span>GD {team.stats.goalDiff >= 0 ? "+" : ""}{team.stats.goalDiff}</span>
          <span>{team.stats.points} PTS</span>
        </div>
      </div>

      <div style={{ padding: "16px 24px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Pill active={tab === "roster"} onClick={() => setTab("roster")}>Roster</Pill>
        <Pill active={tab === "schedule"} onClick={() => setTab("schedule")}>Schedule</Pill>
        <Pill active={tab === "moments"} onClick={() => setTab("moments")}>Moments{teamMoments.length > 0 ? ` (${teamMoments.length})` : ""}</Pill>
        <Pill active={tab === "channel"} onClick={() => setTab("channel")}>
          Channel{channelMessages.length > 0 ? ` (${channelMessages.length})` : ""}
          {channelUnread && (
            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: theme.color.pink, marginLeft: 6 }} />
          )}
        </Pill>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {tab === "roster" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {team.roster.map((p) => {
              const playerKey = p.playerKey ?? p.userId;
              if (editingJerseyKey === playerKey) {
                return (
                  <div key={playerKey} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: "9px 12px" }}>
                    <input
                      autoFocus
                      inputMode="numeric"
                      value={jerseyDraft}
                      onChange={(e) => setJerseyDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                      style={{ width: 50, padding: 6, borderRadius: 6, border: `1px solid ${theme.color.border}` }}
                    />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.displayName}</span>
                    <button
                      disabled={jerseySaving}
                      onClick={() => saveJerseyNumber(playerKey)}
                      style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}
                    >
                      {jerseySaving ? "Submitting…" : "Submit"}
                    </button>
                    <button onClick={() => { setEditingJerseyKey(null); setJerseyError(null); }} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12 }}>
                      Cancel
                    </button>
                  </div>
                );
              }
              return (
                <RosterTile
                  key={playerKey}
                  player={p}
                  onClick={() => setOpenPlayer(p)}
                  suspended={computePlayerSuspension(games, team.id, playerKey).suspended}
                  onJerseyClick={
                    isStaff
                      ? () => { setEditingJerseyKey(playerKey); setJerseyDraft(String(p.jerseyNumber ?? "")); setJerseyError(null); }
                      : undefined
                  }
                />
              );
            })}
            {isStaff && jerseyError && <div style={{ color: theme.color.danger, fontSize: 12.5 }}>{jerseyError}</div>}
            {team.roster.length === 0 && (
              <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
                {teamError
                  ? `Couldn't load players: ${teamError}`
                  : "No players found for this team in registration (playersRegistered)."}
              </div>
            )}
          </div>
        )}

        {tab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {teamGames.map((g) => {
              const isHome = g.homeTeamId === team.id;
              const opponent = teamById.get(isHome ? g.awayTeamId : g.homeTeamId);
              const opponentLabel =
                opponent?.name ??
                provisionalSideLabel(isHome ? g.awayDrawPos : g.homeDrawPos, isHome ? g.awayRef : g.homeRef) ??
                "TBD";
              const homeGoals = g.homeScore ?? 0;
              const awayGoals = g.awayScore ?? 0;
              return (
                <Card
                  key={g.id}
                  onClick={() => navigate(`/game/${g.id}`)}
                  style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginBottom: 2 }}>
                      {dayDateLabel(g.day)} · {g.field}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                      {isHome ? "vs" : "@"} {opponentLabel}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusBadge status={g.status} />
                    <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16, marginTop: 4 }}>
                      {g.status === "scheduled" ? formatKickoffTime(g.kickoffTime) : `${homeGoals}–${awayGoals}`}
                    </div>
                  </div>
                </Card>
              );
            })}
            {teamGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No games scheduled yet.</div>}
          </div>
        )}

        {tab === "moments" && (
          teamMoments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 10px", background: "#F7F6F3", borderRadius: theme.radius.sm }}>
              <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 12 }}>No moments tagged yet.</div>
              <PrimaryButton onClick={() => setAddMomentOpen(true)}>+ ADD A MOMENT</PrimaryButton>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <div onClick={() => setAddMomentOpen(true)} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: theme.color.purple }}>
                  + Add
                </div>
              </div>
              <div className="grid-4">
                {teamMoments.map((m) => (
                  <Card
                    key={m.id}
                    onClick={() => m.mediaType !== "embed" && setLightbox({ src: m.mediaUrl, mediaType: m.mediaType })}
                    style={{ padding: 0, overflow: "hidden", cursor: m.mediaType === "embed" ? "default" : "pointer" }}
                  >
                    {m.mediaType === "embed" ? (
                      <iframe
                        src={m.mediaUrl}
                        style={{ width: "100%", height: 90, border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={m.caption}
                      />
                    ) : m.mediaType === "video" ? (
                      <video src={m.mediaUrl} style={{ width: "100%", height: 90, objectFit: "cover" }} />
                    ) : (
                      <img src={m.mediaUrl} style={{ width: "100%", height: 90, objectFit: "cover" }} alt={m.caption} />
                    )}
                  </Card>
                ))}
              </div>
            </>
          )
        )}

        {tab === "channel" && <TeamChannelPanel teamId={team.id} />}
      </div>

      <div style={{ padding: "0 16px 32px" }}>
        <SponsorStrip sponsors={sponsors} />
      </div>

      {openPlayer && <PlayerCardModal player={openPlayer} teamId={team.id} teamName={team.name} onClose={() => setOpenPlayer(null)} />}
      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
      {addMomentOpen && <MomentUploadModal onClose={() => setAddMomentOpen(false)} initialTeamTagIds={[team.id]} />}
    </div>
  );
}
