import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, computePlayerSuspension, formatKickoffTime, type Game, type GameEvent, type GameEventType, type GoalScorerEvent, type RosterEntry } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGame, useGameScorers, useGames, useTeam } from "../hooks/useData";
import { reopenGameCard } from "../lib/callables";
import { Card, Pill, PrimaryButton, Modal } from "../components/ui";
import { PlayerIdModal } from "../components/PlayerIdModal";
import { ForfeitModal } from "../components/ForfeitModal";
import { FlagIncidentModal } from "../components/FlagIncidentModal";
import { SubmitGameCardModal } from "../components/SubmitGameCardModal";

const EVENT_TYPES: { id: GameEventType; label: string; icon: string }[] = [
  { id: "yellow_card", label: "Yellow", icon: "🟨" },
  { id: "red_card", label: "Red", icon: "🟥" },
];

export function RefereeGameScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "RefereeGame">) {
  const { gameId } = route.params;
  const { user } = useAuth();
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
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

  if (!game || !home || !away) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  if (user && !(game.refereeUids ?? []).includes(user.uid)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.bg, alignItems: "center", justifyContent: "center", padding: 40 }}>
        <Text style={{ color: theme.color.textMuted, textAlign: "center" }}>You're not assigned to this game.</Text>
      </View>
    );
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
    Alert.alert(
      "Make changes?",
      "This sends the game back for commissioner review and unlocks it for changes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reopen",
          style: "destructive",
          onPress: async () => {
            setReopening(true);
            setReopenError(null);
            try {
              await reopenGameCard({ gameId });
            } catch (e) {
              setReopenError(e instanceof Error ? e.message : "Couldn't reopen the game card.");
            } finally {
              setReopening(false);
            }
          },
        },
      ]
    );
  }

  async function completeGateCheck() {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      "gateCheck.completedAt": Date.now(),
      "gateCheck.completedBy": user.uid,
    });
  }

  async function adjustScore(side: "home" | "away", delta: number) {
    const field = side === "home" ? "homeScore" : "awayScore";
    const current = side === "home" ? homeGoals : awayGoals;
    const next = Math.max(0, current + delta);
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { [field]: next, updatedAt: Date.now() });
  }

  async function logEvent(player: RosterEntry, side: "home" | "away") {
    if (!user || !eventPicker) return;
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
    const remaining = g.events.filter((e) => e.id !== eventId);
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { events: remaining });
  }

  // Separate from the score +/- above (and separate from card events) by
  // design: staying decoupled means marking the score never requires a
  // player picker in the way — this is a fully optional, staff-only add-on
  // a referee can tap whenever, not a gate the score has to pass through.
  async function logScorer(player: RosterEntry, side: "home" | "away") {
    if (!user) return;
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
    if (!gameScorers) return;
    const remaining = gameScorers.scorers.filter((s) => s.id !== scorerId);
    await updateDoc(doc(db, COLLECTIONS.gameScorers, gameId), { scorers: remaining });
  }

  async function pickMotm(userId: string) {
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { motmUserId: userId });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: "#A79FC0", fontSize: 13, marginBottom: 10 }}>‹ Back to assignments</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{home.name} vs {away.name}</Text>
        <Text style={styles.headerSub}>{category?.label} · {game.field} · {game.day.toUpperCase()} {formatKickoffTime(game.kickoffTime)}</Text>
      </View>

      {game.status === "forfeited" ? (
        <Card style={{ margin: 20 }}>
          <Text style={{ fontWeight: "800", color: theme.color.danger }}>FORFEITED</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 4 }}>{game.forfeit?.reason}</Text>
        </Card>
      ) : (
        <View style={{ padding: 20, gap: 24 }}>
          <TouchableOpacity onPress={() => setForfeitOpen(true)} style={styles.forfeitBtn}>
            <Text style={{ color: theme.color.danger, fontWeight: "700", fontSize: 13 }}>🚩 Declare Forfeit / No-Show</Text>
          </TouchableOpacity>

          {/* Step 1: Gate check — locked once the card's been submitted, since
              re-clearing/un-clearing players after the fact would silently
              fail against firestore.rules anyway. */}
          <View style={{ opacity: locked ? 0.5 : 1 }} pointerEvents={locked ? "none" : "auto"}>
            <StepLabel n={1} title="GATE CHECK" done={gateComplete} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <RosterColumn teamName={home.name} roster={home.roster} cleared={homeCleared} games={allGames} teamId={g.homeTeamId} onPick={(p) => setIdModalPlayer({ player: p, side: "home" })} />
              <RosterColumn teamName={away.name} roster={away.roster} cleared={awayCleared} games={allGames} teamId={g.awayTeamId} onPick={(p) => setIdModalPlayer({ player: p, side: "away" })} />
            </View>
            {!gateComplete ? (
              <PrimaryButton
                style={{ marginTop: 12, width: "100%" }}
                disabled={homeCleared.length < minPerSide || awayCleared.length < minPerSide}
                onPress={completeGateCheck}
              >
                COMPLETE GATE CHECK ({homeCleared.length}/{minPerSide} · {awayCleared.length}/{minPerSide})
              </PrimaryButton>
            ) : (
              <View style={styles.doneBanner}>
                <Text style={{ color: theme.color.success, fontWeight: "700", fontSize: 13 }}>Gate check complete ✓</Text>
              </View>
            )}
          </View>

          {/* Step 2: Match console (locked until gate check is complete, and
              again once the card's been submitted — see `locked` above) */}
          <View style={{ opacity: gateComplete && !locked ? 1 : 0.4 }} pointerEvents={gateComplete && !locked ? "auto" : "none"}>
            <StepLabel n={2} title="MATCH CONSOLE" />
            <View style={styles.scoreBox}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <ScoreStepper label={home.name} value={homeGoals} onAdjust={(d) => adjustScore("home", d)} />
                <Text style={{ color: "#fff", opacity: 0.6, fontWeight: "800", fontSize: 24 }}>–</Text>
                <ScoreStepper label={away.name} value={awayGoals} onAdjust={(d) => adjustScore("away", d)} />
              </View>
              <Text style={{ color: "#fff", opacity: 0.7, fontSize: 12, marginTop: 10, textAlign: "center" }}>Tap + / − to update the live score directly.</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              {(["home", "away"] as const).map((side) => (
                <View key={side} style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.color.textMuted }}>{side === "home" ? home.name : away.name}</Text>
                  {EVENT_TYPES.map((et) => (
                    <TouchableOpacity key={et.id} onPress={() => setEventPicker({ type: et.id, side })} style={styles.eventBtn}>
                      <Text style={{ fontSize: 13, fontWeight: "600" }}>{et.icon} {et.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setScorerPicker(side)} style={styles.eventBtn}>
                    <Text style={{ fontSize: 13, fontWeight: "600" }}>⚽ Log scorer</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.color.textMuted, marginBottom: 6 }}>CARD LOG</Text>
            <View style={{ gap: 4, marginBottom: 14 }}>
              {game.events.map((e) => (
                <View key={e.id} style={styles.logRow}>
                  <Text style={{ fontSize: 13 }}>{e.minute}' {e.type.replace("_", " ")} #{e.playerNumber}</Text>
                  <TouchableOpacity onPress={() => undoEvent(e.id)}>
                    <Text style={{ color: theme.color.danger, fontSize: 12 }}>Undo</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {game.events.length === 0 && <Text style={{ fontSize: 12, color: theme.color.textMuted }}>No cards yet.</Text>}
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.color.textMuted, marginBottom: 6 }}>
              GOALS · visible to organizers only, never the public
            </Text>
            <View style={{ gap: 4 }}>
              {(gameScorers?.scorers ?? []).map((s) => (
                <View key={s.id} style={styles.logRow}>
                  <Text style={{ fontSize: 13 }}>{s.minute}' ⚽ #{s.playerNumber}</Text>
                  <TouchableOpacity onPress={() => undoScorer(s.id)}>
                    <Text style={{ color: theme.color.danger, fontSize: 12 }}>Undo</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {(gameScorers?.scorers.length ?? 0) === 0 && <Text style={{ fontSize: 12, color: theme.color.textMuted }}>No scorers logged yet — optional.</Text>}
            </View>
          </View>

          {/* Step 3: Player of the Game — restricted to players who are both
              check-in-approved and gate-check-cleared for this game, never
              the full roster (see eligibleRoster above). */}
          <View style={{ opacity: gateComplete && !locked ? 1 : 0.4 }} pointerEvents={gateComplete && !locked ? "auto" : "none"}>
            <StepLabel n={3} title="PLAYER OF THE GAME" />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <Pill active={motmSide === "home"} onPress={() => setMotmSide("home")}>{home.name}</Pill>
              <Pill active={motmSide === "away"} onPress={() => setMotmSide("away")}>{away.name}</Pill>
            </View>
            <View style={{ gap: 6 }}>
              {eligibleRoster(motmSide).map((p) => {
                const playerKey = p.playerKey ?? p.userId;
                return (
                  <Pill key={playerKey} active={game.motmUserId === playerKey} onPress={() => pickMotm(playerKey)}>
                    #{p.jerseyNumber} {p.displayName}
                  </Pill>
                );
              })}
              {eligibleRoster(motmSide).length === 0 && (
                <Text style={{ fontSize: 12, color: theme.color.textMuted }}>No cleared, verified players yet.</Text>
              )}
            </View>
          </View>

          {/* Step 4: Submit card — gated on gate check only, not on `locked`:
              once a card's been submitted this step is exactly where the
              submitted/final status and the "make changes" escape hatch
              live, so it must stay fully interactive rather than dimming
              itself out along with the now-locked steps above. */}
          <View style={{ opacity: gateComplete ? 1 : 0.4 }} pointerEvents={gateComplete ? "auto" : "none"}>
            <StepLabel n={4} title="SUBMIT GAME CARD" />
            {cardStatus === "not_submitted" && (
              <PrimaryButton disabled={!game.motmUserId} onPress={() => setCardOpen(true)} style={{ width: "100%" }}>
                SUBMIT GAME CARD
              </PrimaryButton>
            )}
            {cardStatus === "awaiting_commissioner" && (
              <View style={{ gap: 8 }}>
                <View style={styles.pendingBanner}>
                  <Text style={{ color: theme.color.warning, fontWeight: "700", fontSize: 13 }}>Awaiting commissioner ⏳</Text>
                </View>
                <TouchableOpacity onPress={reopen} disabled={reopening} style={[styles.reopenBtn, reopening && { opacity: 0.6 }]}>
                  <Text style={{ color: theme.color.textMuted, fontWeight: "700", fontSize: 12.5 }}>
                    {reopening ? "Reopening…" : "✏️ Make changes (sends back for commissioner review)"}
                  </Text>
                </TouchableOpacity>
                {reopenError && <Text style={{ color: theme.color.danger, fontSize: 12.5 }}>{reopenError}</Text>}
              </View>
            )}
            {cardStatus === "final" && (
              <View style={styles.doneBanner}>
                <Text style={{ color: theme.color.success, fontWeight: "700", fontSize: 13 }}>Final ✓ · called by commissioner — no further changes can be made</Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => setFlagOpen(true)} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: theme.color.blue, fontWeight: "600" }}>Flag an incident for the commissioner</Text>
          </TouchableOpacity>
        </View>
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
      {forfeitOpen && <ForfeitModal gameId={gameId} onClose={() => setForfeitOpen(false)} />}
      {flagOpen && <FlagIncidentModal gameId={gameId} onClose={() => setFlagOpen(false)} />}
      {cardOpen && <SubmitGameCardModal gameId={gameId} onClose={() => setCardOpen(false)} />}
      {eventPicker && (
        <Modal visible onClose={() => setEventPicker(null)}>
          <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Which player?</Text>
          <View style={{ gap: 6 }}>
            {eligibleRoster(eventPicker.side)
              .filter((p) => !redCardedUids.has(p.playerKey ?? p.userId))
              .map((p) => (
                <TouchableOpacity key={p.playerKey ?? p.userId} onPress={() => logEvent(p, eventPicker.side)} style={styles.pickerRow}>
                  <Text style={{ fontSize: 13.5 }}>#{p.jerseyNumber ?? "—"} {p.displayName}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </Modal>
      )}
      {scorerPicker && (
        <Modal visible onClose={() => setScorerPicker(null)}>
          <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Which player?</Text>
          <View style={{ gap: 6 }}>
            {eligibleRoster(scorerPicker)
              .filter((p) => !redCardedUids.has(p.playerKey ?? p.userId))
              .map((p) => (
                <TouchableOpacity key={p.playerKey ?? p.userId} onPress={() => logScorer(p, scorerPicker)} style={styles.pickerRow}>
                  <Text style={{ fontSize: 13.5 }}>#{p.jerseyNumber ?? "—"} {p.displayName}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

function ScoreStepper({ label, value, onAdjust }: { label: string; value: number; onAdjust: (delta: number) => void }) {
  return (
    <View style={{ alignItems: "center", gap: 6, minWidth: 90 }}>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", opacity: 0.75, textAlign: "center" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity onPress={() => onAdjust(-1)} disabled={value <= 0} style={[styles.stepperBtn, value <= 0 && { opacity: 0.35 }]}>
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 32, width: 36, textAlign: "center" }}>{value}</Text>
        <TouchableOpacity onPress={() => onAdjust(1)} style={styles.stepperBtn}>
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StepLabel({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? theme.color.success : theme.color.navy, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{done ? "✓" : n}</Text>
      </View>
      <Text style={{ fontWeight: "800", fontSize: 16 }}>{title}</Text>
    </View>
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
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.color.textMuted, marginBottom: 6 }}>{teamName}</Text>
      <View style={{ gap: 4 }}>
        {roster.map((p) => {
          const playerKey = p.playerKey ?? p.userId;
          const suspension = computePlayerSuspension(games, teamId, playerKey);
          const tag = gateStatusTag(p, cleared.includes(playerKey), suspension.suspended);
          return (
            <TouchableOpacity key={playerKey} onPress={() => onPick(p)} style={styles.rosterRow}>
              <Text style={{ fontSize: 13, flex: 1 }}>#{p.jerseyNumber ?? "—"} {p.displayName}</Text>
              <View style={{ backgroundColor: tag.bg, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: tag.fg }}>{tag.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {roster.length === 0 && <Text style={{ fontSize: 12, color: theme.color.textMuted }}>No roster yet.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: theme.color.navy, padding: 20, paddingTop: 60 },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 22 },
  headerSub: { color: "#A79FC0", fontSize: 13, marginTop: 4 },
  forfeitBtn: { borderWidth: 1, borderColor: theme.color.danger, borderRadius: theme.radius.sm, paddingVertical: 10, paddingHorizontal: 14, alignSelf: "flex-start" },
  doneBanner: { marginTop: 12, backgroundColor: theme.color.successBg, borderRadius: theme.radius.sm, padding: 10, alignItems: "center" },
  pendingBanner: { backgroundColor: theme.color.warningBg, borderRadius: theme.radius.sm, padding: 10, alignItems: "center" },
  scoreBox: { backgroundColor: theme.color.navy, borderRadius: theme.radius.md, padding: 20, alignItems: "center", marginBottom: 10 },
  scoreText: { color: "#fff", fontWeight: "800", fontSize: 40 },
  stepperBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,.4)", alignItems: "center", justifyContent: "center" },
  stepperBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  eventBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
  logRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: theme.color.border },
  pickerRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
  reopenBtn: { borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" },
  rosterRow: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
});
