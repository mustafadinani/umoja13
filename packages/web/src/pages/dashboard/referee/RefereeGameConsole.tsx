import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, type GameEvent, type GameEventType, type RosterEntry } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useGame, useTeam } from "../../../hooks/useData";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { PlayerIdModal } from "./PlayerIdModal";
import { ForfeitModal } from "./ForfeitModal";
import { FlagIncidentModal } from "./FlagIncidentModal";
import { SubmitGameCardModal } from "./SubmitGameCardModal";

const EVENT_TYPES: { id: GameEventType; label: string; icon: string }[] = [
  { id: "goal", label: "Goal", icon: "⚽" },
  { id: "yellow_card", label: "Yellow", icon: "🟨" },
  { id: "red_card", label: "Red", icon: "🟥" },
];

export function RefereeGameConsole() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
  const [idModalPlayer, setIdModalPlayer] = useState<{ player: RosterEntry; side: "home" | "away" } | null>(null);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [eventPicker, setEventPicker] = useState<{ type: GameEventType; side: "home" | "away" } | null>(null);

  const category = CATEGORIES.find((c) => c.id === game?.categoryId);
  const minPerSide = category?.minPlayersToStart ?? 4;

  const redCardedUids = useMemo(
    () => new Set((game?.events ?? []).filter((e) => e.type === "red_card").map((e) => e.playerId)),
    [game?.events]
  );

  if (!game || !home || !away) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;
  if (user && game.refereeUid !== user.uid) {
    return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>You're not assigned to this game.</div>;
  }

  const g = game;
  const homeCleared = game.gateCheck?.homeClearedUids ?? [];
  const awayCleared = game.gateCheck?.awayClearedUids ?? [];
  const gateComplete = !!game.gateCheck?.completedAt;
  const homeGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.homeTeamId).length;
  const awayGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.awayTeamId).length;
  const roster = [...home.roster, ...away.roster];
  const cardStatus = game.gameCard?.status ?? "not_submitted";

  async function toggleClear(side: "home" | "away", userId: string) {
    const field = side === "home" ? "gateCheck.homeClearedUids" : "gateCheck.awayClearedUids";
    const list = side === "home" ? homeCleared : awayCleared;
    if (!gameId) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      [field]: list.includes(userId) ? arrayRemove(userId) : arrayUnion(userId),
    });
  }

  async function completeGateCheck() {
    if (!gameId || !user) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      "gateCheck.completedAt": Date.now(),
      "gateCheck.completedBy": user.uid,
    });
  }

  async function logEvent(player: RosterEntry, side: "home" | "away") {
    if (!gameId || !user || !eventPicker) return;
    const teamId = side === "home" ? g.homeTeamId : g.awayTeamId;
    const event: GameEvent = {
      id: `${Date.now()}-${player.userId}`,
      type: eventPicker.type,
      teamId,
      playerId: player.userId,
      playerNumber: player.jerseyNumber ?? 0,
      minute: Math.min(90, 4 + g.events.length * 9),
      createdAt: Date.now(),
      createdBy: user.uid,
    };
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { events: arrayUnion(event), updatedAt: Date.now() });
    setEventPicker(null);
  }

  async function undoEvent(eventId: string) {
    if (!gameId) return;
    const remaining = g.events.filter((e) => e.id !== eventId);
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { events: remaining });
  }

  async function pickMotm(userId: string) {
    if (!gameId) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { motmUserId: userId });
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ background: theme.color.navy, color: "#fff", padding: 24 }}>
        <div onClick={() => navigate("/dashboard")} style={{ fontSize: 13, color: "#A79FC0", cursor: "pointer", marginBottom: 10 }}>‹ Back to assignments</div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 24 }}>{home.name} vs {away.name}</div>
        <div style={{ fontSize: 13, color: "#A79FC0", marginTop: 4 }}>{category?.label} · {game.field} · {game.day.toUpperCase()} {game.kickoffTime}</div>
      </div>

      {game.status === "forfeited" ? (
        <Card style={{ margin: 24 }}>
          <div style={{ fontWeight: 800, color: theme.color.danger }}>FORFEITED</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 4 }}>{game.forfeit?.reason}</div>
        </Card>
      ) : (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          <button
            onClick={() => setForfeitOpen(true)}
            style={{ background: "none", border: `1px solid ${theme.color.danger}`, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "10px 14px", fontWeight: 700, fontSize: 13 }}
          >
            🚩 Declare Forfeit / No-Show
          </button>

          {/* Step 1: Gate check */}
          <div>
            <StepLabel n={1} title="GATE CHECK" done={gateComplete} />
            <div className="grid-2-equal">
              <RosterColumn teamName={home.name} roster={home.roster} cleared={homeCleared} onPick={(p) => setIdModalPlayer({ player: p, side: "home" })} />
              <RosterColumn teamName={away.name} roster={away.roster} cleared={awayCleared} onPick={(p) => setIdModalPlayer({ player: p, side: "away" })} />
            </div>
            {!gateComplete ? (
              <PrimaryButton
                style={{ marginTop: 12, width: "100%" }}
                disabled={homeCleared.length < minPerSide || awayCleared.length < minPerSide}
                onClick={completeGateCheck}
              >
                COMPLETE GATE CHECK ({homeCleared.length}/{minPerSide} · {awayCleared.length}/{minPerSide})
              </PrimaryButton>
            ) : (
              <div style={{ marginTop: 12, background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                Gate check complete ✓
              </div>
            )}
          </div>

          {/* Step 2: Match console (locked) */}
          <div style={{ opacity: gateComplete ? 1 : 0.4, pointerEvents: gateComplete ? "auto" : "none" }}>
            <StepLabel n={2} title="MATCH CONSOLE" />
            <div style={{ background: theme.color.navy, color: "#fff", borderRadius: theme.radius.md, padding: 20, textAlign: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 40, whiteSpace: "nowrap" }}>{homeGoals} – {awayGoals}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Score is driven only by Goal events below.</div>
            </div>
            <div className="grid-2-equal" style={{ marginBottom: 12 }}>
              {(["home", "away"] as const).map((side) => (
                <div key={side} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted }}>{side === "home" ? home.name : away.name}</div>
                  {EVENT_TYPES.map((et) => (
                    <button
                      key={et.id}
                      onClick={() => setEventPicker({ type: et.id, side })}
                      style={{ padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, background: "#fff", fontSize: 13, fontWeight: 600 }}
                    >
                      {et.icon} {et.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>MATCH LOG</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {game.events.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", background: "#fff", borderRadius: 6, border: `1px solid ${theme.color.border}` }}>
                  <span>{e.minute}' {e.type.replace("_", " ")} #{e.playerNumber}</span>
                  <button onClick={() => undoEvent(e.id)} style={{ background: "none", border: "none", color: theme.color.danger, fontSize: 12 }}>Undo</button>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: MOTM */}
          <div style={{ opacity: gateComplete ? 1 : 0.4, pointerEvents: gateComplete ? "auto" : "none" }}>
            <StepLabel n={3} title="MAN OF THE MATCH" />
            <div data-testid="motm-section" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {roster.map((p) => (
                <Pill key={p.userId} active={game.motmUserId === p.userId} onClick={() => pickMotm(p.userId)}>
                  #{p.jerseyNumber} {p.displayName}
                </Pill>
              ))}
            </div>
          </div>

          {/* Step 4: Submit card */}
          <div style={{ opacity: gateComplete ? 1 : 0.4, pointerEvents: gateComplete ? "auto" : "none" }}>
            <StepLabel n={4} title="SUBMIT GAME CARD" />
            {cardStatus === "not_submitted" && (
              <PrimaryButton disabled={!game.motmUserId} onClick={() => setCardOpen(true)} style={{ width: "100%" }}>
                SUBMIT GAME CARD
              </PrimaryButton>
            )}
            {cardStatus === "awaiting_commissioner" && (
              <div style={{ background: theme.color.warningBg, color: theme.color.warning, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                Awaiting commissioner ⏳
              </div>
            )}
            {cardStatus === "final" && (
              <div style={{ background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                Final ✓ · called by commissioner
              </div>
            )}
          </div>

          <div onClick={() => setFlagOpen(true)} style={{ textAlign: "center", fontSize: 13, color: theme.color.blue, fontWeight: 600, cursor: "pointer" }}>
            Flag an incident for the commissioner
          </div>
        </div>
      )}

      {idModalPlayer && (
        <PlayerIdModal
          player={idModalPlayer.player}
          teamName={idModalPlayer.side === "home" ? home.name : away.name}
          category={category}
          cleared={(idModalPlayer.side === "home" ? homeCleared : awayCleared).includes(idModalPlayer.player.userId)}
          onToggleClear={() => { toggleClear(idModalPlayer.side, idModalPlayer.player.userId); setIdModalPlayer(null); }}
          onClose={() => setIdModalPlayer(null)}
        />
      )}
      {forfeitOpen && gameId && <ForfeitModal gameId={gameId} onClose={() => setForfeitOpen(false)} />}
      {flagOpen && gameId && <FlagIncidentModal gameId={gameId} onClose={() => setFlagOpen(false)} />}
      {cardOpen && gameId && <SubmitGameCardModal gameId={gameId} onClose={() => setCardOpen(false)} onSubmitted={() => {}} />}
      {eventPicker && (
        <EventPlayerPicker
          roster={eventPicker.side === "home" ? home.roster : away.roster}
          redCardedUids={redCardedUids}
          onPick={(p) => logEvent(p, eventPicker.side)}
          onClose={() => setEventPicker(null)}
        />
      )}
    </div>
  );
}

function StepLabel({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? theme.color.success : theme.color.navy, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {done ? "✓" : n}
      </div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16 }}>{title}</div>
    </div>
  );
}

function RosterColumn({
  teamName, roster, cleared, onPick,
}: { teamName: string; roster: RosterEntry[]; cleared: string[]; onPick: (p: RosterEntry) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>{teamName}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {roster.map((p) => (
          <Card key={p.userId} onClick={() => onPick(p)} data-testid="gate-check-row" style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>#{p.jerseyNumber ?? "—"} {p.displayName}</span>
            {cleared.includes(p.userId) && <span style={{ color: theme.color.success, fontWeight: 800 }}>✓</span>}
          </Card>
        ))}
        {roster.length === 0 && <div style={{ fontSize: 12, color: theme.color.textMuted }}>No roster yet.</div>}
      </div>
    </div>
  );
}

function EventPlayerPicker({
  roster, redCardedUids, onPick, onClose,
}: { roster: RosterEntry[]; redCardedUids: Set<string>; onPick: (p: RosterEntry) => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,12,32,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: theme.radius.lg, width: 320, maxHeight: "80vh", overflowY: "auto", padding: 20 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Which player?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {roster.filter((p) => !redCardedUids.has(p.userId)).map((p) => (
            <button key={p.userId} onClick={() => onPick(p)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: `1px solid ${theme.color.border}`, background: "#fff", fontSize: 13.5 }}>
              #{p.jerseyNumber ?? "—"} {p.displayName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
