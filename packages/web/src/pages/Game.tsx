import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, formatKickoffTime, type Game as GameDoc, type GameStatus, type RosterEntry, type Team } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useGame, useMoments, useSponsors, useTeam } from "../hooks/useData";
import { Card, Pill, PrimaryButton, StatusBadge } from "../components/ui";
import { RosterTile } from "../components/RosterTile";
import { MomentUploadModal } from "../components/MomentUploadModal";
import { PlayerCardModal } from "../components/PlayerCardModal";
import { SponsorStrip } from "../components/SponsorStrip";

type OpenPlayer = { player: RosterEntry; teamId: string; teamName: string; rosterChecked?: boolean };

const EVENT_ICON: Record<string, string> = { yellow_card: "🟨", red_card: "🟥" };

export function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
  const { data: categories } = useCategories();
  const { data: allMoments } = useMoments();
  const { data: sponsors } = useSponsors();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openPlayer, setOpenPlayer] = useState<OpenPlayer | null>(null);

  if (!game) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;

  const isAdmin = profile?.roles.includes("admin") ?? false;
  const homeGoals = game.homeScore ?? 0;
  const awayGoals = game.awayScore ?? 0;
  const gameMoments = allMoments.filter((m) => m.gameId === game.id);

  async function setStatus(status: GameStatus) {
    if (!gameId) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { status, updatedAt: Date.now() });
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 48px", width: "100%" }}>
      <div style={{ background: theme.color.navy, color: "#fff", padding: "20px 16px" }}>
        <div onClick={() => navigate(-1)} style={{ fontSize: 13, color: "#A79FC0", cursor: "pointer", marginBottom: 10 }}>‹ Back</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <StatusBadge status={game.status} />
          <div style={{ fontSize: 12, color: "#A79FC0" }}>
            {categories.find((c) => c.id === game.categoryId)?.label ?? game.categoryId} · {game.field}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, textAlign: "center", marginTop: 18 }}>
          <TeamAvatar name={home?.name} color={home?.color} onClick={() => home && navigate(`/team/${home.id}`)} />
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: "clamp(36px, 10vw, 56px)", whiteSpace: "nowrap" }}>
            {game.status === "scheduled" ? formatKickoffTime(game.kickoffTime) : `${homeGoals}–${awayGoals}`}
          </div>
          <TeamAvatar name={away?.name} color={away?.color} onClick={() => away && navigate(`/team/${away.id}`)} />
        </div>

        {isAdmin && (
          <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center" }}>
            {(["scheduled", "live", "final"] as GameStatus[]).map((s) => (
              <Pill key={s} active={game.status === s} onClick={() => setStatus(s)}>{s.toUpperCase()}</Pill>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        <PrimaryButton style={{ width: "100%" }} onClick={() => setUploadOpen(true)}>+ SHARE A MOMENT</PrimaryButton>

        {(home?.roster.length || away?.roster.length) ? (
          <RosterSection home={home} away={away} game={game} onSelectPlayer={setOpenPlayer} />
        ) : null}

        {gameMoments.length > 0 && (
          <div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>MOMENTS FROM THIS GAME</div>
            <div className="grid-3">
              {gameMoments.map((m) => (
                <Card key={m.id} style={{ padding: 0, overflow: "hidden" }}>
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

      <div style={{ marginTop: 32 }}>
        <SponsorStrip sponsors={sponsors} />
      </div>

      {uploadOpen && <MomentUploadModal onClose={() => setUploadOpen(false)} gameId={game.id} source="game" />}
      {openPlayer && (
        <PlayerCardModal
          player={openPlayer.player}
          teamId={openPlayer.teamId}
          teamName={openPlayer.teamName}
          rosterChecked={openPlayer.rosterChecked}
          onClose={() => setOpenPlayer(null)}
        />
      )}
    </div>
  );
}

function TeamAvatar({ name, color, onClick }: { name?: string; color?: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <div style={{ width: 60, height: 60, margin: "0 auto 6px", borderRadius: "50%", background: color ?? theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 20 }}>
        {(name ?? "TBD").slice(0, 2).toUpperCase()}
      </div>
      <div style={{ fontWeight: 600, fontSize: 13.5, textDecoration: "underline", textDecorationColor: "rgba(255,255,255,.5)" }}>{name ?? "TBD"}</div>
      <div style={{ fontSize: 10, color: "#A79FC0", marginTop: 2 }}>View details ›</div>
    </div>
  );
}

function RosterSection({
  home, away, game, onSelectPlayer,
}: { home?: Team | null; away?: Team | null; game: GameDoc; onSelectPlayer: (p: OpenPlayer) => void }) {
  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>ROSTER</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {home && <RosterColumn team={home} game={game} onSelectPlayer={onSelectPlayer} />}
        {away && <RosterColumn team={away} game={game} onSelectPlayer={onSelectPlayer} />}
      </div>
    </div>
  );
}

function RosterColumn({ team, game, onSelectPlayer }: { team: Team; game: GameDoc; onSelectPlayer: (p: OpenPlayer) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: theme.color.textMuted, letterSpacing: 0.5, marginBottom: 6 }}>
        {team.name.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {team.roster.map((p) => (
          <RosterRow key={p.playerKey ?? p.userId} player={p} team={team} game={game} onClick={(rosterChecked) => onSelectPlayer({ player: p, teamId: team.id, teamName: team.name, rosterChecked })} />
        ))}
      </div>
    </div>
  );
}

function RosterRow({ player, team, game, onClick }: { player: RosterEntry; team: Team; game: GameDoc; onClick: (rosterChecked: boolean) => void }) {
  const playerKey = player.playerKey ?? player.userId;
  const cardEvents = game.events.filter((e) => e.playerId === playerKey);
  const isMotm = game.motmUserId === playerKey;
  const clearedUids = team.id === game.homeTeamId ? game.gateCheck.homeClearedUids : game.gateCheck.awayClearedUids;
  const rosterChecked = clearedUids.includes(playerKey);
  return (
    <RosterTile
      player={player}
      onClick={() => onClick(rosterChecked)}
      rosterChecked={rosterChecked}
      trailing={
        <>
          {isMotm && <span style={{ fontSize: 11, fontWeight: 700, color: theme.color.warning }}>★ Player of the Game</span>}
          {cardEvents.map((e) => (
            <span key={e.id} style={{ fontSize: 12 }}>{EVENT_ICON[e.type]}</span>
          ))}
        </>
      }
    />
  );
}
