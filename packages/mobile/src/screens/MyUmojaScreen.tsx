import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CATEGORIES } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames, useTeam } from "../hooks/useData";
import { Card, PrimaryButton } from "../components/ui";
import { JoinTeamModal } from "../components/JoinTeamModal";
import { CaptainComplaintModal } from "../components/CaptainComplaintModal";
import { useState } from "react";

export function MyUmojaScreen({ navigation }: BottomTabScreenProps<any>) {
  const { user, profile, signOut } = useAuth();
  const { data: games } = useGames();
  const [joinOpen, setJoinOpen] = useState(false);
  const [complaintTeamId, setComplaintTeamId] = useState<string | null>(null);
  const memberships = profile?.playerOf ?? [];
  const myTeamIds = new Set(memberships.map((m) => m.teamId));
  const myGames = games.filter((g) => myTeamIds.has(g.homeTeamId) || myTeamIds.has(g.awayTeamId));
  const captainMemberships = memberships.filter((m) => m.isCaptain);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={{ color: "#fff", fontWeight: "800" }}>{profile?.displayName?.slice(0, 2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 17 }}>{profile?.displayName}</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 12 }}>{profile?.primaryRole}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Notifications")}><Text style={{ fontSize: 20 }}>🔔</Text></TouchableOpacity>
      </View>

      {memberships.length === 0 ? (
        <View style={styles.section}>
          <Card>
            <Text style={{ fontWeight: "700", marginBottom: 6 }}>Not on a roster yet</Text>
            <PrimaryButton onPress={() => setJoinOpen(true)}>JOIN A TEAM</PrimaryButton>
          </Card>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TOURNAMENT PASS</Text>
            {memberships.map((m) => (
              <Card key={m.teamId} onPress={() => navigation.getParent()?.navigate("CheckIn", { teamId: m.teamId, categoryId: m.categoryId })} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: "700" }}>{CATEGORIES.find((c) => c.id === m.categoryId)?.label ?? m.categoryId}</Text>
                <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>Tap to check in / view pass</Text>
              </Card>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY TEAMS</Text>
            {memberships.map((m) => <TeamRow key={m.teamId} teamId={m.teamId} onPress={() => navigation.getParent()?.navigate("Team", { teamId: m.teamId })} />)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY GAMES</Text>
            {myGames.map((g) => (
              <Card key={g.id} onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })} style={{ marginBottom: 6 }}>
                <Text style={{ fontWeight: "600" }}>{g.day.toUpperCase()} · {g.field} · {g.kickoffTime}</Text>
              </Card>
            ))}
            {myGames.length === 0 && <Text style={{ color: theme.color.textMuted }}>No games scheduled yet.</Text>}
          </View>

          {captainMemberships.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CAPTAIN TOOLS</Text>
              {captainMemberships.map((m) => (
                <CaptainComplaintRow key={m.teamId} teamId={m.teamId} onPress={() => setComplaintTeamId(m.teamId)} />
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <Card onPress={() => navigation.getParent()?.navigate("Complaint")}>
          <Text style={{ fontWeight: "600" }}>Report an issue to the commissioner</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={{ color: theme.color.danger, fontWeight: "700", textAlign: "center" }}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {joinOpen && <JoinTeamModal onClose={() => setJoinOpen(false)} />}
      {complaintTeamId && <CaptainComplaintTeamWrapper teamId={complaintTeamId} onClose={() => setComplaintTeamId(null)} />}
    </ScrollView>
  );
}

function TeamRow({ teamId, onPress }: { teamId: string; onPress: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <Card onPress={onPress} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontWeight: "700", color: team.color }}>{team.name}</Text>
      <Text style={{ color: theme.color.textMuted }}>#{team.stats.groupRank ?? "—"} · {team.stats.points} pts</Text>
    </Card>
  );
}

function CaptainComplaintRow({ teamId, onPress }: { teamId: string; onPress: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <Card onPress={onPress} style={{ marginBottom: 6 }}>
      <Text style={{ fontWeight: "600" }}>File a complaint — {team.name}</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>$35 review fee, refunded if upheld</Text>
    </Card>
  );
}

function CaptainComplaintTeamWrapper({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return <CaptainComplaintModal teamName={team.name} onClose={onClose} />;
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 12, backgroundColor: theme.color.purple, alignItems: "center", justifyContent: "center" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 8 },
});
