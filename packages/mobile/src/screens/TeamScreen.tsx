import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames, useTeam } from "../hooks/useData";
import { Card, StatusBadge } from "../components/ui";

export function TeamScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Team">) {
  const { teamId } = route.params;
  const { profile } = useAuth();
  const { data: team } = useTeam(teamId);
  const { data: games } = useGames();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!team) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);
  const isCaptain = profile?.playerOf?.some((m) => m.teamId === team.id && m.isCaptain) ?? false;

  async function saveNumber(userId: string) {
    const num = Number(draft);
    if (!draft || Number.isNaN(num)) return setError("Enter a valid number.");
    const dup = team!.roster.some((p) => p.userId !== userId && p.jerseyNumber === num);
    if (dup) return setError("That number is already taken on this team.");
    setError(null);
    const roster = team!.roster.map((p) => (p.userId === userId ? { ...p, jerseyNumber: num } : p));
    await updateDoc(doc(db, COLLECTIONS.teams, team!.id), { roster });
    setEditingUserId(null);
  }

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
          <Card key={p.userId} style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
            {isCaptain && editingUserId === p.userId ? (
              <>
                <TextInput
                  autoFocus
                  value={draft}
                  onChangeText={setDraft}
                  keyboardType="number-pad"
                  style={styles.jerseyInput}
                />
                <TouchableOpacity onPress={() => saveNumber(p.userId)} style={styles.saveBtn}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingUserId(null)}>
                  <Text style={{ color: theme.color.textMuted, fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                disabled={!isCaptain}
                onPress={() => { setEditingUserId(p.userId); setDraft(String(p.jerseyNumber ?? "")); setError(null); }}
              >
                <Text style={{ fontWeight: "800", fontSize: 15, color: theme.color.purple, width: 34 }}>#{p.jerseyNumber ?? "—"}</Text>
              </TouchableOpacity>
            )}
            <Text style={{ fontWeight: "600", flex: 1 }}>{p.displayName}{p.isCaptain ? " (C)" : ""}</Text>
            <Text style={{ color: p.checkInStatus === "approved" ? theme.color.success : theme.color.warning, fontWeight: "700", fontSize: 12 }}>
              {p.checkInStatus === "approved" ? "Cleared" : "Pending"}
            </Text>
          </Card>
        ))}
        {team.roster.length === 0 && <Text style={{ color: theme.color.textMuted }}>Roster not published yet.</Text>}
        {isCaptain && error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 6 }}>{error}</Text>}
        {isCaptain && <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 8 }}>Tap a jersey number to edit it.</Text>}
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
  jerseyInput: { width: 46, borderWidth: 1, borderColor: theme.color.border, borderRadius: 6, padding: 6, textAlign: "center" },
  saveBtn: { backgroundColor: theme.color.navy, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
});
