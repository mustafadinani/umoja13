import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type GameStatus } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useGame, useMoments, useTeam } from "../hooks/useData";
import { Card, Pill, PrimaryButton, StatusBadge } from "../components/ui";
import { MomentUploadModal } from "../components/MomentUploadModal";

const EVENT_ICON: Record<string, string> = { goal: "⚽", yellow_card: "🟨", red_card: "🟥" };

export function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
  const { data: categories } = useCategories();
  const { data: allMoments } = useMoments();
  const [uploadOpen, setUploadOpen] = useState(false);

  if (!game) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;

  const isAdmin = profile?.roles.includes("admin") ?? false;
  const homeGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.homeTeamId).length;
  const awayGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.awayTeamId).length;
  const gameMoments = allMoments.filter((m) => m.gameId === game.id);
  const roster = [...(home?.roster ?? []), ...(away?.roster ?? [])];
  const myVote = profile ? game.potmVotes?.[profile.uid] ?? null : null;

  async function setStatus(status: GameStatus) {
    if (!gameId) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { status, updatedAt: Date.now() });
  }

  async function votePotm(playerId: string) {
    if (!profile || !gameId) return;
    const same = myVote === playerId;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      [`potmVotes.${profile.uid}`]: same ? null : playerId,
    });
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 48px" }}>
      <div style={{ background: theme.color.navy, color: "#fff", padding: "24px" }}>
        <div onClick={() => navigate(-1)} style={{ fontSize: 13, color: "#A79FC0", cursor: "pointer", marginBottom: 10 }}>‹ Back</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <StatusBadge status={game.status} />
          <div style={{ fontSize: 12, color: "#A79FC0" }}>
            {categories.find((c) => c.id === game.categoryId)?.label ?? game.categoryId} · {game.field}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, textAlign: "center", marginTop: 18 }}>
          <TeamAvatar name={home?.name} color={home?.color} onClick={() => home && navigate(`/team/${home.id}`)} />
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 56, whiteSpace: "nowrap" }}>
            {game.status === "scheduled" ? game.kickoffTime : `${homeGoals}–${awayGoals}`}
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

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <PrimaryButton style={{ width: "100%" }} onClick={() => setUploadOpen(true)}>+ SHARE A MOMENT</PrimaryButton>

        {roster.length > 0 && (
          <div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>PLAYER OF THE MATCH</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {roster.slice(0, 6).map((p) => {
                const castVotes = Object.values(game.potmVotes ?? {}).filter((v): v is string => !!v);
                const votes = castVotes.filter((v) => v === p.userId).length;
                const total = castVotes.length || 1;
                const pct = Math.round((votes / total) * 100);
                const isMyVote = myVote === p.userId;
                return (
                  <div
                    key={p.userId}
                    onClick={() => votePotm(p.userId)}
                    style={{
                      cursor: "pointer", background: isMyVote ? theme.color.purpleLight + "22" : "#fff",
                      border: `1px solid ${isMyVote ? theme.color.purple : theme.color.border}`,
                      borderRadius: theme.radius.sm, padding: "8px 12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, fontWeight: 600 }}>
                      <span>{isMyVote && "✓ "}#{p.jerseyNumber} {p.displayName}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "#F1EFF5", borderRadius: 99, marginTop: 6 }}>
                      <div style={{ height: 6, width: `${pct}%`, background: theme.color.purple, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>WHAT'S HAPPENED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {game.events.map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 10, fontSize: 13.5, alignItems: "center" }}>
                <span style={{ color: theme.color.textMuted, width: 32 }}>{e.minute}'</span>
                <span>{EVENT_ICON[e.type]}</span>
                <span>#{e.playerNumber} — {e.type.replace("_", " ")}</span>
              </div>
            ))}
            {game.events.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No events logged yet.</div>}
          </div>
        </div>

        {gameMoments.length > 0 && (
          <div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>MOMENTS FROM THIS GAME</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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

      {uploadOpen && <MomentUploadModal onClose={() => setUploadOpen(false)} gameId={game.id} source="game" />}
    </div>
  );
}

function TeamAvatar({ name, color, onClick }: { name?: string; color?: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <div style={{ width: 60, height: 60, margin: "0 auto 6px", borderRadius: "50%", background: color ?? theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 20 }}>
        {(name ?? "TBD").slice(0, 2).toUpperCase()}
      </div>
      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{name ?? "TBD"}</div>
    </div>
  );
}
