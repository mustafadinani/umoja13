import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, type RosterEntry } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames, useMoments, useTeam } from "../hooks/useData";
import { Card, Pill, StatusBadge } from "../components/ui";
import { LoadingImage } from "../components/LoadingImage";
import { PlayerCardModal } from "../components/PlayerCardModal";
import { Lightbox } from "../components/Lightbox";

type Tab = "roster" | "schedule" | "moments";

export function TeamScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Team">) {
  const { teamId } = route.params;
  const { profile } = useAuth();
  const { data: team } = useTeam(teamId);
  const { data: games } = useGames();
  const { data: moments } = useMoments();
  const [tab, setTab] = useState<Tab>("roster");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openPlayer, setOpenPlayer] = useState<RosterEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ uri: string; mediaType: "photo" | "video" } | null>(null);

  if (!team) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);
  const rosterUids = new Set(team.roster.map((p) => p.userId));
  // Team moments plus any moment tagging a player on this roster — a fan
  // tagging just the player should still surface it here.
  const teamMoments = moments
    .filter((m) => m.teamTagIds?.includes(team.id) || m.playerTagUids?.some((uid) => rosterUids.has(uid)))
    .sort((a, b) => b.createdAt - a.createdAt);
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

      <View style={styles.tabRow}>
        <Pill active={tab === "roster"} onPress={() => setTab("roster")}>ROSTER</Pill>
        <Pill active={tab === "schedule"} onPress={() => setTab("schedule")}>SCHEDULE</Pill>
        <Pill active={tab === "moments"} onPress={() => setTab("moments")}>MOMENTS{teamMoments.length > 0 ? ` (${teamMoments.length})` : ""}</Pill>
      </View>

      {tab === "roster" && (
        <View style={styles.section}>
          {team.roster.map((p) => (
            <Card key={p.userId} onPress={() => setOpenPlayer(p)} style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
              {p.selfieUrl ? (
                <LoadingImage source={{ uri: p.selfieUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{p.displayName.slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
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
      )}

      {tab === "schedule" && (
        <View style={styles.section}>
          {teamGames.map((g) => (
            <Card key={g.id} onPress={() => navigation.navigate("Game", { gameId: g.id })} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
              <Text>{g.day.toUpperCase()} · {g.field}</Text>
              <StatusBadge status={g.status} />
            </Card>
          ))}
          {teamGames.length === 0 && <Text style={{ color: theme.color.textMuted }}>No games scheduled yet.</Text>}
        </View>
      )}

      {tab === "moments" && (
        <View style={styles.section}>
          {teamMoments.length === 0 ? (
            <Text style={{ color: theme.color.textMuted }}>No moments tagged yet.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {teamMoments.map((m) => (
                <TouchableOpacity key={m.id} onPress={() => setLightbox({ uri: m.mediaUrl, mediaType: m.mediaType })} activeOpacity={0.85}>
                  {m.mediaType === "video" ? (
                    <View style={[styles.momentTile, styles.momentTileVideo]}>
                      <Text style={{ fontSize: 20 }}>▶</Text>
                    </View>
                  ) : (
                    <LoadingImage source={{ uri: m.mediaUrl }} style={styles.momentTile} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
      {openPlayer && <PlayerCardModal player={openPlayer} teamId={team.id} teamName={team.name} onClose={() => setOpenPlayer(null)} />}
      <Lightbox visible={!!lightbox} src={lightbox?.uri ?? null} mediaType={lightbox?.mediaType} onClose={() => setLightbox(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20 },
  teamName: { color: "#fff", fontWeight: "800", fontSize: 22 },
  sub: { color: "#fff", opacity: 0.9, fontSize: 12, marginTop: 4 },
  tabRow: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 0 },
  section: { padding: 16 },
  jerseyInput: { width: 46, borderWidth: 1, borderColor: theme.color.border, borderRadius: 6, padding: 6, textAlign: "center" },
  saveBtn: { backgroundColor: theme.color.navy, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: theme.color.purple, alignItems: "center", justifyContent: "center" },
  momentTile: { width: 84, height: 84, borderRadius: 8 },
  momentTileVideo: { backgroundColor: theme.color.navy, alignItems: "center", justifyContent: "center" },
});
