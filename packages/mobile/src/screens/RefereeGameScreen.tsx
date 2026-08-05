import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, type GameEvent, type GameEventType, type RosterEntry } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGame, useTeam } from "../hooks/useData";
import { Card, Pill, PrimaryButton, Modal } from "../components/ui";
import { PlayerIdModal } from "../components/PlayerIdModal";
import { ForfeitModal } from "../components/ForfeitModal";
import { FlagIncidentModal } from "../components/FlagIncidentModal";
import { SubmitGameCardModal } from "../components/SubmitGameCardModal";

const EVENT_TYPES: { id: GameEventType; label: string; icon: string }[] = [
  { id: "goal", label: "Goal", icon: "⚽" },
  { id: "yellow_card", label: "Yellow", icon: "🟨" },
  { id: "red_card", label: "Red", icon: "🟥" },
];

export function RefereeGameScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "RefereeGame">) {
  const { gameId } = route.params;
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

  if (!game || !home || !away) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  if (user && game.refereeUid !== user.uid) {
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
  const homeGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.homeTeamId).length;
  const awayGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.awayTeamId).length;
  const roster = [...home.roster, ...away.roster];
  const cardStatus = game.gameCard?.status ?? "not_submitted";

  async function toggleClear(side: "home" | "away", userId: string) {
    const field = side === "home" ? "gateCheck.homeClearedUids" : "gateCheck.awayClearedUids";
    const list = side === "home" ? homeCleared : awayCleared;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      [field]: list.includes(userId) ? arrayRemove(userId) : arrayUnion(userId),
    });
  }

  async function completeGateCheck() {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.games, gameId), {
      "gateCheck.completedAt": Date.now(),
      "gateCheck.completedBy": user.uid,
    });
  }

  async function logEvent(player: RosterEntry, side: "home" | "away") {
    if (!user || !eventPicker) return;
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
    const remaining = g.events.filter((e) => e.id !== eventId);
    await updateDoc(doc(db, COLLECTIONS.games, gameId), { events: remaining });
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
        <Text style={styles.headerSub}>{category?.label} · {game.field} · {game.day.toUpperCase()} {game.kickoffTime}</Text>
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

          {/* Step 1: Gate check */}
          <View>
            <StepLabel n={1} title="GATE CHECK" done={gateComplete} />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <RosterColumn teamName={home.name} roster={home.roster} cleared={homeCleared} onPick={(p) => setIdModalPlayer({ player: p, side: "home" })} />
              <RosterColumn teamName={away.name} roster={away.roster} cleared={awayCleared} onPick={(p) => setIdModalPlayer({ player: p, side: "away" })} />
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

          {/* Step 2: Match console */}
          <View style={{ opacity: gateComplete ? 1 : 0.4 }} pointerEvents={gateComplete ? "auto" : "none"}>
            <StepLabel n={2} title="MATCH CONSOLE" />
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>{homeGoals} – {awayGoals}</Text>
              <Text style={{ color: "#fff", opacity: 0.7, fontSize: 12, marginTop: 4 }}>Score is driven only by Goal events below.</Text>
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
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.color.textMuted, marginBottom: 6 }}>MATCH LOG</Text>
            <View style={{ gap: 4 }}>
              {game.events.map((e) => (
                <View key={e.id} style={styles.logRow}>
                  <Text style={{ fontSize: 13 }}>{e.minute}' {e.type.replace("_", " ")} #{e.playerNumber}</Text>
                  <TouchableOpacity onPress={() => undoEvent(e.id)}>
                    <Text style={{ color: theme.color.danger, fontSize: 12 }}>Undo</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Step 3: MOTM */}
          <View style={{ opacity: gateComplete ? 1 : 0.4 }} pointerEvents={gateComplete ? "auto" : "none"}>
            <StepLabel n={3} title="MAN OF THE MATCH" />
            <View style={{ gap: 6 }}>
              {roster.map((p) => (
                <Pill key={p.userId} active={game.motmUserId === p.userId} onPress={() => pickMotm(p.userId)}>
                  #{p.jerseyNumber} {p.displayName}
                </Pill>
              ))}
            </View>
          </View>

          {/* Step 4: Submit card */}
          <View style={{ opacity: gateComplete ? 1 : 0.4 }} pointerEvents={gateComplete ? "auto" : "none"}>
            <StepLabel n={4} title="SUBMIT GAME CARD" />
            {cardStatus === "not_submitted" && (
              <PrimaryButton disabled={!game.motmUserId} onPress={() => setCardOpen(true)} style={{ width: "100%" }}>
                SUBMIT GAME CARD
              </PrimaryButton>
            )}
            {cardStatus === "awaiting_commissioner" && (
              <View style={styles.pendingBanner}>
                <Text style={{ color: theme.color.warning, fontWeight: "700", fontSize: 13 }}>Awaiting commissioner ⏳</Text>
              </View>
            )}
            {cardStatus === "final" && (
              <View style={styles.doneBanner}>
                <Text style={{ color: theme.color.success, fontWeight: "700", fontSize: 13 }}>Final ✓ · called by commissioner</Text>
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
          cleared={(idModalPlayer.side === "home" ? homeCleared : awayCleared).includes(idModalPlayer.player.userId)}
          onToggleClear={() => { toggleClear(idModalPlayer.side, idModalPlayer.player.userId); setIdModalPlayer(null); }}
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
            {(eventPicker.side === "home" ? home.roster : away.roster)
              .filter((p) => !redCardedUids.has(p.userId))
              .map((p) => (
                <TouchableOpacity key={p.userId} onPress={() => logEvent(p, eventPicker.side)} style={styles.pickerRow}>
                  <Text style={{ fontSize: 13.5 }}>#{p.jerseyNumber ?? "—"} {p.displayName}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </Modal>
      )}
    </ScrollView>
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

function RosterColumn({
  teamName, roster, cleared, onPick,
}: { teamName: string; roster: RosterEntry[]; cleared: string[]; onPick: (p: RosterEntry) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.color.textMuted, marginBottom: 6 }}>{teamName}</Text>
      <View style={{ gap: 4 }}>
        {roster.map((p) => (
          <TouchableOpacity key={p.userId} onPress={() => onPick(p)} style={styles.rosterRow}>
            <Text style={{ fontSize: 13, flex: 1 }}>#{p.jerseyNumber ?? "—"} {p.displayName}</Text>
            <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
              {p.checkInStatus === "approved" && (
                <View style={{ backgroundColor: theme.color.successBg, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: "800", color: theme.color.success }}>VERIFIED</Text>
                </View>
              )}
              {cleared.includes(p.userId) && (
                <View style={{ backgroundColor: "#E8EEFC", borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: "800", color: theme.color.blue }}>CHECKED-IN</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
  eventBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
  logRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: theme.color.border },
  pickerRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
  rosterRow: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
});
