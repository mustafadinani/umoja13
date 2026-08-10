import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, formatKickoffTime, type GameEvent, type GameEventType, type RosterEntry } from "@umoja/shared";
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
  { id: "yellow_card", label: "Yellow", icon: "🟨" },
  { id: "red_card", label: "Red", icon: "🟥" },
];

export function RefereeGameConsole() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: game, loading: gameLoading } = useGame(gameId);
  const { data: home, loading: homeLoading } = useTeam(game?.homeTeamId);
  const { data: away, loading: awayLoading } = useTeam(game?.awayTeamId);
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

  // Each hook's own `loading` flag is what actually distinguishes "still in flight" from
  // "fetch finished, nothing found" — checking bare truthiness of `data` can't tell those
  // apart. Without this, a game whose team ids don't resolve (e.g. missing/mismatched
  // registration data) got permanently stuck showing "Loading…" forever, since `!home`/`!away`
  // is true both while genuinely loading and once a lookup has already come back empty.
  if (gameLoading) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;
  if (!game) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Game not found.</div>;
  if (homeLoading || awayLoading) return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>Loading…</div>;
  if (!home || !away) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>
        Couldn't load one of this game's teams — its registration record may be missing. Contact an admin.
      </div>
    );
  }
  if (user && !(game.refereeUids ?? []).includes(user.uid)) {
    return <div style={{ padding: 40, textAlign: "center", color: theme.color.textMuted }}>You're not assigned to this game.</div>;
  }

  const g = game;
  const homeCleared = game.gateCheck?.homeClearedUids ?? [];
  const awayCleared = game.gateCheck?.awayClearedUids ?? [];
  const gateComplete = !!game.gateCheck?.completedAt;
  const homeGoals = game.homeScore ?? 0;
  const awayGoals = game.awayScore ?? 0;
  const roster = [...home.roster, ...away.roster];
  const cardStatus = game.gameCard?.status ?? "not_submitted";

  async function toggleClear(side: "home" | "away", playerKey: string) {
    const field = side === "home" ? "gateCheck.homeClearedUids" : "gateCheck.awayClearedUids";
    const list = side === "home" ? homeCleared : awayCleared;
    if (!gameId) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      [field]: list.includes(playerKey) ? arrayRemove(playerKey) : arrayUnion(playerKey),
    });
  }

  async function completeGateCheck() {
    if (!gameId || !user) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      "gateCheck.completedAt": Date.now(),
      "gateCheck.completedBy": user.uid,
    });
  }

  async function adjustScore(side: "home" | "away", delta: number) {
    if (!gameId) return;
    const field = side === "home" ? "homeScore" : "awayScore";
    const current = side === "home" ? homeGoals : awayGoals;
    const next = Math.max(0, current + delta);
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { [field]: next, updatedAt: Date.now() });
  }

  async function logEvent(player: RosterEntry, side: "home" | "away") {
    if (!gameId || !user || !eventPicker) return;
    const teamId = side === "home" ? g.homeTeamId : g.awayTeamId;
    const playerKey = player.playerKey ?? player.userId;
    const event: GameEvent = {
      id: `${Date.now()}-${playerKey}`,
      type: eventPicker.type,
      teamId,
      playerId: playerKey,
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
        <div style={{ fontSize: 13, color: "#A79FC0", marginTop: 4 }}>{category?.label} · {game.field} · {game.day.toUpperCase()} {formatKickoffTime(game.kickoffTime)}</div>
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
            <div style={{ background: theme.color.navy, color: "#fff", borderRadius: theme.radius.md, padding: 20, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <ScoreStepper label={home.name} value={homeGoals} onAdjust={(d) => adjustScore("home", d)} />
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28, opacity: 0.6 }}>–</div>
                <ScoreStepper label={away.name} value={awayGoals} onAdjust={(d) => adjustScore("away", d)} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10, textAlign: "center" }}>Tap + / − to update the live score directly.</div>
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
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>CARD LOG</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {game.events.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", background: "#fff", borderRadius: 6, border: `1px solid ${theme.color.border}`, flexWrap: "wrap", gap: 6 }}>
                  <span>{e.minute}' {e.type.replace("_", " ")} #{e.playerNumber}</span>
                  <button onClick={() => undoEvent(e.id)} style={{ background: "none", border: "none", color: theme.color.danger, fontSize: 12 }}>Undo</button>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Player of the Game */}
          <div style={{ opacity: gateComplete ? 1 : 0.4, pointerEvents: gateComplete ? "auto" : "none" }}>
            <StepLabel n={3} title="PLAYER OF THE GAME" />
            <div data-testid="motm-section" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {roster.map((p) => {
                const playerKey = p.playerKey ?? p.userId;
                return (
                  <Pill key={playerKey} active={game.motmUserId === playerKey} onClick={() => pickMotm(playerKey)}>
                    #{p.jerseyNumber} {p.displayName}
                  </Pill>
                );
              })}
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
          cleared={(idModalPlayer.side === "home" ? homeCleared : awayCleared).includes(idModalPlayer.player.playerKey ?? idModalPlayer.player.userId)}
          onToggleClear={() => { toggleClear(idModalPlayer.side, idModalPlayer.player.playerKey ?? idModalPlayer.player.userId); setIdModalPlayer(null); }}
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

function ScoreStepper({ label, value, onAdjust }: { label: string; value: number; onAdjust: (delta: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 90 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, textAlign: "center" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => onAdjust(-1)}
          disabled={value <= 0}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,.4)", background: "none", color: "#fff", fontSize: 16, fontWeight: 800, opacity: value <= 0 ? 0.35 : 1 }}
        >
          −
        </button>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, width: 36, textAlign: "center" }}>{value}</div>
        <button
          onClick={() => onAdjust(1)}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,.4)", background: "none", color: "#fff", fontSize: 16, fontWeight: 800 }}
        >
          +
        </button>
      </div>
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

/** One combined tag per player — never two stacked badges — reflecting both facts (tournament-wide Verified, this-game Cleared by Ref) in a single glance. */
function gateStatusTag(p: RosterEntry, isCleared: boolean): { label: string; fg: string; bg: string } {
  if (p.checkInStatus !== "approved") {
    return { label: "NOT VERIFIED", fg: "#fff", bg: theme.color.danger };
  }
  return isCleared
    ? { label: "VERIFIED · CLEARED BY REF", fg: theme.color.success, bg: theme.color.successBg }
    : { label: "VERIFIED · NOT CLEARED YET", fg: theme.color.warning, bg: theme.color.warningBg };
}

function RosterColumn({
  teamName, roster, cleared, onPick,
}: { teamName: string; roster: RosterEntry[]; cleared: string[]; onPick: (p: RosterEntry) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>{teamName}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {roster.map((p) => {
          const playerKey = p.playerKey ?? p.userId;
          const tag = gateStatusTag(p, cleared.includes(playerKey));
          return (
            <Card key={playerKey} onClick={() => onPick(p)} data-testid="gate-check-row" style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 13 }}>#{p.jerseyNumber ?? "—"} {p.displayName}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: tag.fg, background: tag.bg, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
                {tag.label}
              </span>
            </Card>
          );
        })}
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
          {roster.filter((p) => !redCardedUids.has(p.playerKey ?? p.userId)).map((p) => (
            <button key={p.playerKey ?? p.userId} onClick={() => onPick(p)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: `1px solid ${theme.color.border}`, background: "#fff", fontSize: 13.5 }}>
              #{p.jerseyNumber ?? "—"} {p.displayName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
