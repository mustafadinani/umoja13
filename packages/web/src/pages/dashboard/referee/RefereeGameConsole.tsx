import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, computePlayerSuspension, formatKickoffTime, type Game, type GameEvent, type GameEventType, type GoalScorerEvent, type RosterEntry } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useGame, useGameScorers, useGames, useTeam } from "../../../hooks/useData";
import { reopenGameCard } from "../../../lib/callables";
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
  const { data: gameScorers } = useGameScorers(gameId);
  const { data: allGames } = useGames();
  const [idModalPlayer, setIdModalPlayer] = useState<{ player: RosterEntry; side: "home" | "away" } | null>(null);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [eventPicker, setEventPicker] = useState<{ type: GameEventType; side: "home" | "away" } | null>(null);
  const [scorerPicker, setScorerPicker] = useState<"home" | "away" | null>(null);
  const [motmSide, setMotmSide] = useState<"home" | "away">("home");
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

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
  const cardStatus = game.gameCard?.status ?? "not_submitted";
  // Once a card's been submitted, firestore.rules itself blocks every field
  // below from being written by the referee (see games rule's gameCard.status
  // gate) — this mirrors that in the UI so the console reads as locked
  // instead of silently failing writes. "Make changes" (below) is the one
  // deliberate way back into "not_submitted".
  const locked = cardStatus !== "not_submitted";

  // A verified-and-cleared roster is the pool every downstream action (cards,
  // scorers, MOTM) is restricted to — a player who isn't checked-in-approved
  // or hasn't been gate-check-cleared for this specific game has no business
  // being credited with a goal, a card, or Player of the Game.
  function eligibleRoster(side: "home" | "away"): RosterEntry[] {
    // Non-null: the `!home || !away` guard above already returned before this
    // point, but TS doesn't carry that narrowing into a nested function decl.
    const roster = side === "home" ? home!.roster : away!.roster;
    const cleared = side === "home" ? homeCleared : awayCleared;
    return roster.filter((p) => p.checkInStatus === "approved" && cleared.includes(p.playerKey ?? p.userId));
  }

  async function toggleClear(side: "home" | "away", playerKey: string) {
    if (!gameId) return;
    const field = side === "home" ? "gateCheck.homeClearedUids" : "gateCheck.awayClearedUids";
    const list = side === "home" ? homeCleared : awayCleared;
    const clearing = list.includes(playerKey);
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      [field]: clearing ? arrayRemove(playerKey) : arrayUnion(playerKey),
      // Un-clearing a player after gate check was already marked complete
      // must revert it to pending — otherwise the "Gate check complete ✓"
      // banner keeps showing (and Step 2/3 stay unlocked) even though one of
      // the 3-per-side minimum is no longer actually cleared.
      ...(clearing && gateComplete ? { "gateCheck.completedAt": deleteField(), "gateCheck.completedBy": deleteField() } : {}),
    });
  }

  async function reopen() {
    if (!gameId) return;
    if (!window.confirm("This sends the game back for commissioner review and unlocks it for changes. Continue?")) return;
    setReopening(true);
    setReopenError(null);
    try {
      await reopenGameCard({ gameId });
    } catch (e) {
      setReopenError(e instanceof Error ? e.message : "Couldn't reopen the game card.");
    } finally {
      setReopening(false);
    }
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

  // Separate from the score +/- above (and separate from card events) by
  // design: staying decoupled means marking the score never requires a
  // player picker in the way — this is a fully optional, staff-only add-on
  // a referee can tap whenever, not a gate the score has to pass through.
  async function logScorer(player: RosterEntry, side: "home" | "away") {
    if (!gameId || !user) return;
    const teamId = side === "home" ? g.homeTeamId : g.awayTeamId;
    const playerKey = player.playerKey ?? player.userId;
    const scorer: GoalScorerEvent = {
      id: `${Date.now()}-${playerKey}`,
      teamId,
      playerId: playerKey,
      playerNumber: player.jerseyNumber ?? 0,
      minute: Math.min(90, 4 + (gameScorers?.scorers.length ?? 0) * 9),
      createdAt: Date.now(),
      createdBy: user.uid,
    };
    await setDoc(
      doc(db, COLLECTIONS.gameScorers, gameId),
      { gameId, scorers: arrayUnion(scorer), updatedAt: Date.now() },
      { merge: true }
    );
    setScorerPicker(null);
  }

  async function undoScorer(scorerId: string) {
    if (!gameId || !gameScorers) return;
    const remaining = gameScorers.scorers.filter((s) => s.id !== scorerId);
    await updateDoc(doc(db, COLLECTIONS.gameScorers, gameId), { scorers: remaining });
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

          {/* Step 1: Gate check — locked once the card's been submitted, since
              re-clearing/un-clearing players after the fact would silently
              fail against firestore.rules anyway. */}
          <div style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? "none" : "auto" }}>
            <StepLabel n={1} title="GATE CHECK" done={gateComplete} />
            <div className="grid-2-equal">
              <RosterColumn teamName={home.name} roster={home.roster} cleared={homeCleared} games={allGames} teamId={g.homeTeamId} onPick={(p) => setIdModalPlayer({ player: p, side: "home" })} />
              <RosterColumn teamName={away.name} roster={away.roster} cleared={awayCleared} games={allGames} teamId={g.awayTeamId} onPick={(p) => setIdModalPlayer({ player: p, side: "away" })} />
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

          {/* Step 2: Match console (locked until gate check is complete, and
              again once the card's been submitted — see `locked` above) */}
          <div style={{ opacity: gateComplete && !locked ? 1 : 0.4, pointerEvents: gateComplete && !locked ? "auto" : "none" }}>
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
                  <button
                    onClick={() => setScorerPicker(side)}
                    style={{ padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, background: "#fff", fontSize: 13, fontWeight: 600 }}
                  >
                    ⚽ Log scorer
                  </button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>CARD LOG</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              {game.events.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", background: "#fff", borderRadius: 6, border: `1px solid ${theme.color.border}`, flexWrap: "wrap", gap: 6 }}>
                  <span>{e.minute}' {e.type.replace("_", " ")} #{e.playerNumber}</span>
                  <button onClick={() => undoEvent(e.id)} style={{ background: "none", border: "none", color: theme.color.danger, fontSize: 12 }}>Undo</button>
                </div>
              ))}
              {game.events.length === 0 && <div style={{ fontSize: 12, color: theme.color.textMuted }}>No cards yet.</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>
              GOALS <span style={{ fontWeight: 500, textTransform: "none" }}>· visible to organizers only, never the public</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(gameScorers?.scorers ?? []).map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", background: "#fff", borderRadius: 6, border: `1px solid ${theme.color.border}`, flexWrap: "wrap", gap: 6 }}>
                  <span>{s.minute}' ⚽ #{s.playerNumber}</span>
                  <button onClick={() => undoScorer(s.id)} style={{ background: "none", border: "none", color: theme.color.danger, fontSize: 12 }}>Undo</button>
                </div>
              ))}
              {(gameScorers?.scorers.length ?? 0) === 0 && <div style={{ fontSize: 12, color: theme.color.textMuted }}>No scorers logged yet — optional.</div>}
            </div>
          </div>

          {/* Step 3: Player of the Game — restricted to players who are both
              check-in-approved and gate-check-cleared for this game, never
              the full roster (see eligibleRoster above). */}
          <div style={{ opacity: gateComplete && !locked ? 1 : 0.4, pointerEvents: gateComplete && !locked ? "auto" : "none" }}>
            <StepLabel n={3} title="PLAYER OF THE GAME" />
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <Pill active={motmSide === "home"} onClick={() => setMotmSide("home")}>{home.name}</Pill>
              <Pill active={motmSide === "away"} onClick={() => setMotmSide("away")}>{away.name}</Pill>
            </div>
            <div data-testid="motm-section" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {eligibleRoster(motmSide).map((p) => {
                const playerKey = p.playerKey ?? p.userId;
                return (
                  <Pill key={playerKey} active={game.motmUserId === playerKey} onClick={() => pickMotm(playerKey)}>
                    #{p.jerseyNumber} {p.displayName}
                  </Pill>
                );
              })}
              {eligibleRoster(motmSide).length === 0 && (
                <div style={{ fontSize: 12, color: theme.color.textMuted }}>No cleared, verified players yet.</div>
              )}
            </div>
          </div>

          {/* Step 4: Submit card — gated on gate check only, not on `locked`:
              once a card's been submitted this step is exactly where the
              submitted/final status and the "make changes" escape hatch
              live, so it must stay fully interactive rather than dimming
              itself out along with the now-locked steps above. */}
          <div style={{ opacity: gateComplete ? 1 : 0.4, pointerEvents: gateComplete ? "auto" : "none" }}>
            <StepLabel n={4} title="SUBMIT GAME CARD" />
            {cardStatus === "not_submitted" && (
              <PrimaryButton disabled={!game.motmUserId} onClick={() => setCardOpen(true)} style={{ width: "100%" }}>
                SUBMIT GAME CARD
              </PrimaryButton>
            )}
            {cardStatus === "awaiting_commissioner" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ background: theme.color.warningBg, color: theme.color.warning, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                  Awaiting commissioner ⏳
                </div>
                <button
                  onClick={reopen}
                  disabled={reopening}
                  style={{ background: "none", border: `1px solid ${theme.color.border}`, color: theme.color.textMuted, borderRadius: theme.radius.sm, padding: "10px 14px", fontWeight: 700, fontSize: 12.5, opacity: reopening ? 0.6 : 1 }}
                >
                  {reopening ? "Reopening…" : "✏️ Make changes (sends back for commissioner review)"}
                </button>
                {reopenError && <div style={{ color: theme.color.danger, fontSize: 12.5 }}>{reopenError}</div>}
              </div>
            )}
            {cardStatus === "final" && (
              <div style={{ background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                Final ✓ · called by commissioner — no further changes can be made
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
          suspension={computePlayerSuspension(
            allGames,
            idModalPlayer.side === "home" ? g.homeTeamId : g.awayTeamId,
            idModalPlayer.player.playerKey ?? idModalPlayer.player.userId
          )}
          onToggleClear={() => { toggleClear(idModalPlayer.side, idModalPlayer.player.playerKey ?? idModalPlayer.player.userId); setIdModalPlayer(null); }}
          onClose={() => setIdModalPlayer(null)}
        />
      )}
      {forfeitOpen && gameId && <ForfeitModal gameId={gameId} onClose={() => setForfeitOpen(false)} />}
      {flagOpen && gameId && <FlagIncidentModal gameId={gameId} onClose={() => setFlagOpen(false)} />}
      {cardOpen && gameId && <SubmitGameCardModal gameId={gameId} onClose={() => setCardOpen(false)} onSubmitted={() => {}} />}
      {eventPicker && (
        <EventPlayerPicker
          roster={eligibleRoster(eventPicker.side)}
          redCardedUids={redCardedUids}
          onPick={(p) => logEvent(p, eventPicker.side)}
          onClose={() => setEventPicker(null)}
        />
      )}
      {scorerPicker && (
        <EventPlayerPicker
          roster={eligibleRoster(scorerPicker)}
          redCardedUids={redCardedUids}
          onPick={(p) => logScorer(p, scorerPicker)}
          onClose={() => setScorerPicker(null)}
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

/**
 * One combined tag per player — never two stacked badges — reflecting the
 * most important fact for the referee in a single glance. `suspended` (a
 * disciplinary flag from computePlayerSuspension) outranks identity
 * verification: it's the one fact most likely to change the referee's
 * decision, and it's advisory only — this never blocks the clear/unclear
 * toggle itself, it's still the referee's call.
 */
function gateStatusTag(p: RosterEntry, isCleared: boolean, suspended: boolean): { label: string; fg: string; bg: string } {
  if (suspended) {
    return { label: "🚫 SUSPENDED THIS GAME", fg: "#fff", bg: theme.color.danger };
  }
  if (p.checkInStatus !== "approved") {
    return { label: "NOT VERIFIED", fg: "#fff", bg: theme.color.danger };
  }
  return isCleared
    ? { label: "VERIFIED · CLEARED BY REF", fg: theme.color.success, bg: theme.color.successBg }
    : { label: "VERIFIED · NOT CLEARED YET", fg: theme.color.warning, bg: theme.color.warningBg };
}

function RosterColumn({
  teamName, roster, cleared, games, teamId, onPick,
}: { teamName: string; roster: RosterEntry[]; cleared: string[]; games: Game[]; teamId: string; onPick: (p: RosterEntry) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>{teamName}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {roster.map((p) => {
          const playerKey = p.playerKey ?? p.userId;
          const suspension = computePlayerSuspension(games, teamId, playerKey);
          const tag = gateStatusTag(p, cleared.includes(playerKey), suspension.suspended);
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
