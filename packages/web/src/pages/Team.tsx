import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { channelHasUnread, type RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useCategories, useGames, useMoments, useSponsors, useTeam, useTeamChannel } from "../hooks/useData";
import { markChannelRead } from "../lib/callables";
import { Card, Pill, PrimaryButton, StatusBadge } from "../components/ui";
import { RosterTile } from "../components/RosterTile";
import { PlayerCardModal } from "../components/PlayerCardModal";
import { Lightbox } from "../components/Lightbox";
import { MomentUploadModal } from "../components/MomentUploadModal";
import { TeamChannelPanel } from "../components/TeamChannelPanel";
import { SponsorStrip } from "../components/SponsorStrip";

type Tab = "roster" | "schedule" | "moments" | "channel";

export function Team() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: team, error: teamError } = useTeam(teamId);
  const { data: categories } = useCategories();
  const { data: games } = useGames();
  const { data: moments } = useMoments();
  const { data: channel } = useTeamChannel(teamId);
  const { data: sponsors } = useSponsors();
  const [tab, setTab] = useState<Tab>("roster");
  const [openPlayer, setOpenPlayer] = useState<RosterEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(false);
  const channelUnread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);

  useEffect(() => {
    if (tab === "channel" && user && teamId) void markChannelRead({ kind: "team", id: teamId });
  }, [tab, teamId, user]);

  if (!team) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;

  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);
  const rosterUids = new Set(team.roster.map((p) => p.userId));
  // Team moments plus any moment tagging a player on this roster — a fan
  // tagging just the player should still surface it here.
  const teamMoments = moments
    .filter((m) => m.teamTagIds?.includes(team.id) || m.playerTagUids?.some((uid) => rosterUids.has(uid)))
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
            {team.roster.map((p) => (
              <RosterTile key={p.playerKey ?? p.userId} player={p} onClick={() => setOpenPlayer(p)} />
            ))}
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
            {teamGames.map((g) => (
              <Card key={g.id} onClick={() => navigate(`/game/${g.id}`)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13.5 }}>{g.day.toUpperCase()} · {g.field}</span>
                <StatusBadge status={g.status} />
              </Card>
            ))}
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
                    onClick={() => setLightbox({ src: m.mediaUrl, mediaType: m.mediaType })}
                    style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                  >
                    {m.mediaType === "video" ? (
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
