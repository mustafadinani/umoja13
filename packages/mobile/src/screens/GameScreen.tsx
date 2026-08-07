import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { CATEGORIES, type Game as GameDoc, type RosterEntry, type Team } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGame, useMoments, useTeam } from "../hooks/useData";
import { StatusBadge, Card } from "../components/ui";
import { RosterTile } from "../components/RosterTile";
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
        <RosterRow key={p.playerKey ?? p.userId} player={p} team={team} game={game} onPress={() => onSelectPlayer({ player: p, teamId: team.id, teamName: team.name })} />
      ))}
    </View>
  );
}

function RosterRow({ player, team, game, onPress }: { player: RosterEntry; team: Team; game: GameDoc; onPress: () => void }) {
  const playerKey = player.playerKey ?? player.userId;
  const cardEvents = game.events.filter((e) => e.playerId === playerKey);
  const isMotm = game.motmUserId === playerKey;
  const clearedUids = team.id === game.homeTeamId ? game.gateCheck.homeClearedUids : game.gateCheck.awayClearedUids;
  const rosterChecked = clearedUids.includes(playerKey);
  return (
    <RosterTile
      player={player}
      onPress={onPress}
      rosterChecked={rosterChecked}
      trailing={
        <>
          {isMotm && <Text style={{ fontSize: 11, fontWeight: "700", color: theme.color.warning }}>★ MOTM</Text>}
          {cardEvents.map((e) => (
            <Text key={e.id} style={{ fontSize: 12 }}>{EVENT_ICON[e.type]}</Text>
          ))}
        </>
      }
    />
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
});
