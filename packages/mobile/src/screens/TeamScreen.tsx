import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { CATEGORIES, type RosterEntry } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames, useMoments, useTeam, useTeamChannel } from "../hooks/useData";
import { sendTeamMessage } from "../lib/callables";
import { Card, Pill, PrimaryButton, StatusBadge } from "../components/ui";
import { LoadingImage } from "../components/LoadingImage";
import { PlayerCardModal } from "../components/PlayerCardModal";
import { Lightbox } from "../components/Lightbox";
import { MomentUploadModal } from "../components/MomentUploadModal";

type Tab = "roster" | "schedule" | "moments" | "channel";

export function TeamScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Team">) {
  const { teamId } = route.params;
  const { profile } = useAuth();
  const { data: team, error: teamError } = useTeam(teamId);
  const { data: games } = useGames();
  const { data: moments } = useMoments();
  const { data: channel } = useTeamChannel(teamId);
  const [tab, setTab] = useState<Tab>("roster");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openPlayer, setOpenPlayer] = useState<RosterEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ uri: string; mediaType: "photo" | "video" } | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(false);
  const [channelDraft, setChannelDraft] = useState("");
  const [sending, setSending] = useState(false);

  if (!team) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);
  const rosterUids = new Set(team.roster.map((p) => p.userId));
  // Team moments plus any moment tagging a player on this roster — a fan
  // tagging just the player should still surface it here.
  const teamMoments = moments
    .filter((m) => m.teamTagIds?.includes(team.id) || m.playerTagUids?.some((uid) => rosterUids.has(uid)))
    .sort((a, b) => b.createdAt - a.createdAt);
  const isCaptain = profile?.playerOf?.some((m) => m.teamId === team.id && m.isCaptain) ?? false;
  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const onRoster = profile ? rosterUids.has(profile.uid) : false;
  const canPostToChannel = isStaff || onRoster;
  const channelMessages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function sendChannelMessage() {
    if (!channelDraft.trim()) return;
    setSending(true);
    try {
      await sendTeamMessage({ teamId: team!.id, text: channelDraft });
      setChannelDraft("");
    } finally {
      setSending(false);
    }
  }

  async function saveNumber(userId: string) {
    const num = Number(draft);
    if (!draft || Number.isNaN(num)) return setError("Enter a valid number.");
    const dup = team!.roster.some((p) => p.userId !== userId && p.jerseyNumber === num);
    if (dup) return setError("That number is already taken on this team.");
    // Rosters come from `(default)` playersRegistered — jersey numbers aren't
    // a registration field yet, so captain edits aren't persisted here.
    setError("Jersey numbers can't be saved on registration rosters yet.");
    setEditingUserId(null);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
        <Pill active={tab === "channel"} onPress={() => setTab("channel")}>CHANNEL{channelMessages.length > 0 ? ` (${channelMessages.length})` : ""}</Pill>
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
          {team.roster.length === 0 && (
            <Text style={{ color: theme.color.textMuted }}>
              {teamError
                ? `Couldn't load players: ${teamError}`
                : "No players found for this team in registration (playersRegistered)."}
            </Text>
          )}
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
            <View style={styles.emptyState}>
              <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 10 }}>No moments tagged yet.</Text>
              <PrimaryButton onPress={() => setAddMomentOpen(true)}>+ ADD A MOMENT</PrimaryButton>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => setAddMomentOpen(true)} style={{ alignSelf: "flex-end", marginBottom: 8 }}>
                <Text style={{ color: theme.color.purple, fontWeight: "700", fontSize: 12.5 }}>+ Add</Text>
              </TouchableOpacity>
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
            </>
          )}
        </View>
      )}

      {tab === "channel" && (
        <View style={styles.section}>
          <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 14 }}>
            One-way broadcast from organizers to this team — anyone on the roster can reply back.
          </Text>
          <View style={{ gap: 8, marginBottom: 16 }}>
            {channelMessages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.channelBubble,
                  { alignSelf: m.from === "admin" ? "flex-start" : "flex-end", backgroundColor: m.from === "admin" ? theme.color.navy : "#F1EFF5" },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", opacity: 0.8, marginBottom: 2, color: m.from === "admin" ? "#fff" : theme.color.textMuted }}>
                  {m.from === "admin" ? "Organizers" : m.authorName}
                </Text>
                <Text style={{ fontSize: 13.5, color: m.from === "admin" ? "#fff" : theme.color.text }}>{m.text}</Text>
              </View>
            ))}
            {channelMessages.length === 0 && (
              <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
                {canPostToChannel ? "No messages yet — send the first one to your organizers below." : "No messages yet."}
              </Text>
            )}
          </View>

          {canPostToChannel ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={channelDraft}
                onChangeText={setChannelDraft}
                placeholder={channelMessages.length === 0 ? "Message your organizers…" : "Send a message…"}
                style={styles.channelInput}
              />
              <PrimaryButton disabled={sending || !channelDraft.trim()} onPress={sendChannelMessage}>Send</PrimaryButton>
            </View>
          ) : (
            <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only organizers and players on this team can post here.</Text>
          )}
        </View>
      )}
      {openPlayer && <PlayerCardModal player={openPlayer} teamId={team.id} teamName={team.name} onClose={() => setOpenPlayer(null)} />}
      <Lightbox visible={!!lightbox} src={lightbox?.uri ?? null} mediaType={lightbox?.mediaType} onClose={() => setLightbox(null)} />
      {addMomentOpen && <MomentUploadModal onClose={() => setAddMomentOpen(false)} initialTeamTagIds={[team.id]} />}
    </ScrollView>
    </KeyboardAvoidingView>
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
  emptyState: { alignItems: "center", padding: 18, backgroundColor: "#F7F6F3", borderRadius: 10 },
  channelBubble: { borderRadius: 10, padding: 10, maxWidth: "80%" },
  channelInput: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
});
