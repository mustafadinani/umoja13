import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useCategories, useGames, useMoments, useTeam } from "../hooks/useData";
import { Card, StatusBadge } from "../components/ui";
import { PlayerCardModal } from "../components/PlayerCardModal";
import { Lightbox } from "../components/Lightbox";

export function Team() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { data: team } = useTeam(teamId);
  const { data: categories } = useCategories();
  const { data: games } = useGames();
  const { data: moments } = useMoments();
  const [openPlayer, setOpenPlayer] = useState<RosterEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);

  if (!team) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;

  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);
  const teamMoments = moments.filter((m) => m.teamTagIds?.includes(team.id)).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 48px" }}>
      <div style={{ background: `linear-gradient(120deg, ${team.color}, ${theme.color.pink})`, color: "#fff", padding: 24 }}>
        <div onClick={() => navigate(-1)} style={{ fontSize: 13, opacity: 0.85, cursor: "pointer", marginBottom: 10 }}>‹ Back</div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32 }}>{team.name}</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4 }}>
          {categories.find((c) => c.id === team.categoryId)?.label ?? team.categoryId} · Group {team.group ?? "—"} · Rank #{team.stats.groupRank ?? "—"}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 13.5, fontWeight: 600 }}>
          <span>{team.stats.wins}W-{team.stats.draws}D-{team.stats.losses}L</span>
          <span>GD {team.stats.goalDiff >= 0 ? "+" : ""}{team.stats.goalDiff}</span>
          <span>{team.stats.points} PTS</span>
        </div>
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>ROSTER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {team.roster.map((p) => (
              <Card key={p.userId} onClick={() => setOpenPlayer(p)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p.selfieUrl ? (
                    <img src={p.selfieUrl} alt={p.displayName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>{p.displayName.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <span style={{ fontWeight: 600 }}>{p.displayName}{p.isCaptain && " (C)"}</span>
                  <span style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 15, color: theme.color.purple }}>#{p.jerseyNumber ?? "—"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>
                  {p.goals}G {p.assists}A ·{" "}
                  <span style={{ fontWeight: 700, color: p.checkInStatus === "approved" ? theme.color.success : theme.color.warning }}>
                    {p.checkInStatus === "approved" ? "Cleared" : p.checkInStatus === "pending_review" ? "Pending" : p.checkInStatus}
                  </span>
                </div>
              </Card>
            ))}
            {team.roster.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Roster not published yet.</div>}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>SCHEDULE & RESULTS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {teamGames.map((g) => (
              <Card key={g.id} onClick={() => navigate(`/game/${g.id}`)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5 }}>{g.day.toUpperCase()} · {g.field}</span>
                <StatusBadge status={g.status} />
              </Card>
            ))}
            {teamGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No games scheduled yet.</div>}
          </div>
        </div>

        {teamMoments.length > 0 && (
          <div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>MOMENTS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
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
          </div>
        )}
      </div>
      {openPlayer && <PlayerCardModal player={openPlayer} teamId={team.id} teamName={team.name} onClose={() => setOpenPlayer(null)} />}
      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
    </div>
  );
}
