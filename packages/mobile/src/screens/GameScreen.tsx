import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { CATEGORIES } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGame, useMoments, useTeam } from "../hooks/useData";
import { StatusBadge, Card } from "../components/ui";

const EVENT_ICON: Record<string, string> = { goal: "⚽", yellow_card: "🟨", red_card: "🟥" };

export function GameScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Game">) {
  const { gameId } = route.params;
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
  const { data: moments } = useMoments();

  if (!game || !home || !away) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;

  const homeGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.homeTeamId).length;
  const awayGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.awayTeamId).length;
  const gameMoments = moments.filter((m) => m.gameId === game.id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <StatusBadge status={game.status} />
        <Text style={styles.category}>{CATEGORIES.find((c) => c.id === game.categoryId)?.label} · {game.field}</Text>
        <View style={styles.scoreRow}>
          <TouchableOpacity onPress={() => navigation.navigate("Team", { teamId: home.id })} style={{ flex: 1 }}>
            <View style={[styles.colorDot, { backgroundColor: home.color ?? theme.color.purple }]} />
            <Text style={styles.teamName}>{home.name}</Text>
          </TouchableOpacity>
          <Text style={styles.score}>{game.status === "scheduled" ? game.kickoffTime : `${homeGoals} – ${awayGoals}`}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Team", { teamId: away.id })} style={{ flex: 1, alignItems: "flex-end" }}>
            <View style={[styles.colorDot, { backgroundColor: away.color ?? theme.color.blue }]} />
            <Text style={[styles.teamName, { textAlign: "right" }]}>{away.name}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WHAT'S HAPPENED</Text>
        {game.events.map((e) => (
          <Text key={e.id} style={{ fontSize: 13, marginBottom: 4 }}>{e.minute}' {EVENT_ICON[e.type]} #{e.playerNumber}</Text>
        ))}
        {game.events.length === 0 && <Text style={{ color: theme.color.textMuted }}>No events yet.</Text>}
      </View>

      {gameMoments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MOMENTS FROM THIS GAME</Text>
          {gameMoments.map((m) => <Card key={m.id} style={{ marginBottom: 6 }}><Text>{m.caption}</Text></Card>)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: theme.color.navy, padding: 20 },
  category: { color: "#A79FC0", fontSize: 12, marginTop: 8 },
  scoreRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  teamName: { color: "#fff", fontWeight: "600", fontSize: 13 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  score: { color: "#fff", fontWeight: "800", fontSize: 32, marginHorizontal: 12 },
  section: { padding: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 8 },
});
