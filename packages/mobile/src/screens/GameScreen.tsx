import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { CATEGORIES, type Game as GameDoc, type RosterEntry, type Team } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGame, useMoments, useTeam } from "../hooks/useData";
import { StatusBadge, Card, CheckInStatusPill, Pill } from "../components/ui";
import { PlayerCardModal } from "../components/PlayerCardModal";

const EVENT_ICON: Record<string, string> = { yellow_card: "🟨", red_card: "🟥" };

export function GameScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Game">) {
  const { gameId } = route.params;
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
  const { data: moments } = useMoments();
  const [openPlayer, setOpenPlayer] = useState<{ player: RosterEntry; teamId: string; teamName: string } | null>(null);

  if (!game || !home || !away) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;

  const homeGoals = game.homeScore ?? 0;
  const awayGoals = game.awayScore ?? 0;
  const gameMoments = moments.filter((m) => m.gameId === game.id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <StatusBadge status={game.status} />
        <Text style={styles.category}>{CATEGORIES.find((c) => c.id === game.categoryId)?.label} · {game.field}</Text>
        <View style={styles.scoreRow}>
          <TouchableOpacity onPress={() => navigation.navigate("Team", { teamId: home.id })} style={{ flex: 1 }} activeOpacity={0.6}>
            <View style={[styles.colorDot, { backgroundColor: home.color ?? theme.color.purple }]} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.teamName}>{home.name}</Text>
              <Text style={styles.teamNameChevron}>›</Text>
            </View>
            <Text style={styles.tapHint}>View details</Text>
          </TouchableOpacity>
          <Text style={styles.score}>{game.status === "scheduled" ? game.kickoffTime : `${homeGoals} – ${awayGoals}`}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Team", { teamId: away.id })} style={{ flex: 1, alignItems: "flex-end" }} activeOpacity={0.6}>
            <View style={[styles.colorDot, { backgroundColor: away.color ?? theme.color.blue }]} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.teamNameChevron}>‹</Text>
              <Text style={[styles.teamName, { textAlign: "right" }]}>{away.name}</Text>
            </View>
            <Text style={styles.tapHint}>View details</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(home.roster.length > 0 || away.roster.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ROSTER</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <RosterColumn team={home} game={game} onSelectPlayer={setOpenPlayer} />
            <RosterColumn team={away} game={game} onSelectPlayer={setOpenPlayer} />
          </View>
        </View>
      )}

      {gameMoments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MOMENTS FROM THIS GAME</Text>
          {gameMoments.map((m) => <Card key={m.id} style={{ marginBottom: 6 }}><Text>{m.caption}</Text></Card>)}
        </View>
      )}

      {openPlayer && (
        <PlayerCardModal
          player={openPlayer.player}
          teamId={openPlayer.teamId}
          teamName={openPlayer.teamName}
          onClose={() => setOpenPlayer(null)}
        />
      )}
    </ScrollView>
  );
}

type OpenPlayer = { player: RosterEntry; teamId: string; teamName: string };

function RosterColumn({ team, game, onSelectPlayer }: { team: Team; game: GameDoc; onSelectPlayer: (p: OpenPlayer) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.rosterTeamHeader}>{team.name.toUpperCase()}</Text>
      {team.roster.map((p) => (
        <RosterRow key={p.userId} player={p} game={game} onPress={() => onSelectPlayer({ player: p, teamId: team.id, teamName: team.name })} />
      ))}
    </View>
  );
}

function RosterRow({ player, game, onPress }: { player: RosterEntry; game: GameDoc; onPress: () => void }) {
  const cardEvents = game.events.filter((e) => e.playerId === player.userId);
  const isMotm = game.motmUserId === player.userId;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.rosterRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={styles.rosterNum}>#{player.jerseyNumber ?? "—"}</Text>
        <Text style={styles.rosterName} numberOfLines={1}>
          {player.displayName}{player.isCaptain ? " (C)" : ""}
        </Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>›</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 }}>
        <CheckInStatusPill status={player.checkInStatus} />
        {isMotm && <Pill bg={theme.color.warningBg} fg={theme.color.warning}>★ MOTM</Pill>}
        {cardEvents.map((e) => (
          <Text key={e.id} style={{ fontSize: 14 }}>{EVENT_ICON[e.type]}</Text>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: theme.color.navy, padding: 20 },
  category: { color: "#A79FC0", fontSize: 12, marginTop: 8 },
  scoreRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  teamName: { color: "#fff", fontWeight: "600", fontSize: 13, textDecorationLine: "underline", textDecorationColor: "rgba(255,255,255,.5)" },
  teamNameChevron: { color: theme.color.gold, fontWeight: "800", fontSize: 15 },
  tapHint: { color: "#A79FC0", fontSize: 10, marginTop: 2 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  score: { color: "#fff", fontWeight: "800", fontSize: 32, marginHorizontal: 12 },
  section: { padding: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 8 },
  rosterTeamHeader: { fontSize: 10, fontWeight: "800", color: theme.color.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  rosterRow: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 10, padding: 8, marginBottom: 6 },
  rosterNum: { fontWeight: "800", color: theme.color.purple, fontSize: 12, width: 22 },
  rosterName: { fontSize: 12.5, fontWeight: "600", flex: 1 },
});
