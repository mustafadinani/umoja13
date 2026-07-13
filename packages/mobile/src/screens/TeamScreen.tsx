import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { CATEGORIES } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGames, useTeam } from "../hooks/useData";
import { Card, StatusBadge } from "../components/ui";

export function TeamScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Team">) {
  const { teamId } = route.params;
  const { data: team } = useTeam(teamId);
  const { data: games } = useGames();

  if (!team) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={[styles.header, { backgroundColor: team.color }]}>
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.sub}>{CATEGORIES.find((c) => c.id === team.categoryId)?.label} · Group {team.group ?? "—"}</Text>
        <Text style={styles.sub}>{team.stats.wins}W-{team.stats.draws}D-{team.stats.losses}L · {team.stats.points} pts</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ROSTER</Text>
        {team.roster.map((p) => (
          <Card key={p.userId} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "600" }}>#{p.jerseyNumber ?? "—"} {p.displayName}{p.isCaptain ? " (C)" : ""}</Text>
            <Text style={{ color: p.checkInStatus === "approved" ? theme.color.success : theme.color.warning, fontWeight: "700", fontSize: 12 }}>
              {p.checkInStatus === "approved" ? "Cleared" : "Pending"}
            </Text>
          </Card>
        ))}
        {team.roster.length === 0 && <Text style={{ color: theme.color.textMuted }}>Roster not published yet.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SCHEDULE & RESULTS</Text>
        {teamGames.map((g) => (
          <Card key={g.id} onPress={() => navigation.navigate("Game", { gameId: g.id })} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
            <Text>{g.day.toUpperCase()} · {g.field}</Text>
            <StatusBadge status={g.status} />
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20 },
  teamName: { color: "#fff", fontWeight: "800", fontSize: 22 },
  sub: { color: "#fff", opacity: 0.9, fontSize: 12, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 8 },
});
