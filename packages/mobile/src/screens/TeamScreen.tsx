import { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  CATEGORIES,
  TOURNAMENT_START_AT,
  TOURNAMENT_DAY_DATES,
  computePlayerSuspension,
  formatKickoffTime,
  provisionalSideLabel,
  type Game,
  type RosterEntry,
} from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames, useMoments, useTeam, useTeamChannel, useTeams } from "../hooks/useData";
import { sendTeamMessage, setJerseyNumber } from "../lib/callables";
import { Card, Pill, PrimaryButton, StatusBadge } from "../components/ui";
import { LoadingImage } from "../components/LoadingImage";
import { RosterTile } from "../components/RosterTile";
import { PlayerCardModal } from "../components/PlayerCardModal";
import { Lightbox } from "../components/Lightbox";
import { MomentUploadModal } from "../components/MomentUploadModal";
import { ChannelAttachButton } from "../components/ChannelAttachButton";
import { ChannelAttachmentThumb } from "../components/ChannelAttachmentThumb";
import type { ChannelAttachment } from "../lib/uploadChannelAttachment";

type Tab = "roster" | "schedule" | "moments" | "channel";

/** Short "SAT · AUG 15" tile label — day abbreviation always paired with its actual date. */
function dayDateLabel(day: Game["day"]) {
  return `${day.toUpperCase()} · ${TOURNAMENT_DAY_DATES[day].toUpperCase()}`;
}

export function TeamScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "Team">) {
  const { teamId } = route.params;
  const { profile } = useAuth();
  const { data: team, error: teamError } = useTeam(teamId);
  const { data: games } = useGames();
  const { data: moments } = useMoments();
  const { data: channel } = useTeamChannel(teamId);
  const { data: teams } = useTeams();
  const [tab, setTab] = useState<Tab>("roster");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openPlayer, setOpenPlayer] = useState<RosterEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ uri: string; mediaType: "photo" | "video" } | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(false);
  const [channelDraft, setChannelDraft] = useState("");
  const [channelAttachment, setChannelAttachment] = useState<ChannelAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  if (!team) return <View style={{ flex: 1, backgroundColor: theme.color.bg }} />;
  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);
  // playerKey, not the bare userId — a moment tagged to one sibling on a
  // shared family account must not disappear just because it's checked
  // against the account uid every sibling shares.
  const rosterPlayerKeys = new Set(team.roster.map((p) => p.playerKey ?? p.userId));
  // Team moments plus any moment tagging a player on this roster — a fan
  // tagging just the player should still surface it here.
  const teamMoments = moments
    .filter((m) => m.teamTagIds?.includes(team.id) || m.playerTagUids?.some((uid) => rosterPlayerKeys.has(uid)))
    .sort((a, b) => b.createdAt - a.createdAt);
  const isCaptain = profile?.playerOf?.some((m) => m.teamId === team.id && m.isCaptain) ?? false;
  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  // Account-level, not per-child — "am I on this roster at all" (posting to
  // the team channel) is a family-account question, distinct from the
  // per-child playerKey set used for moments above.
  const onRoster = profile ? team.roster.some((p) => p.userId === profile.uid) : false;
  const canPostToChannel = isStaff || onRoster;
  const channelMessages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function sendChannelMessage() {
    if (!channelDraft.trim() && !channelAttachment) return;
    setSending(true);
    try {
      await sendTeamMessage({ teamId: team!.id, text: channelDraft, ...(channelAttachment ?? {}) });
      setChannelDraft("");
      setChannelAttachment(null);
    } finally {
      setSending(false);
    }
  }

  async function saveNumber(playerKey: string) {
    const num = Number(draft);
    if (!draft || Number.isNaN(num) || num < 0 || num > 999) return setError("Enter a valid number (0–999).");
    setError(null);
    try {
      await setJerseyNumber({ teamId: team!.id, playerKey, categoryId: team!.categoryId, jerseyNumber: num });
      setEditingUserId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that number.");
    }
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
          {team.roster.map((p) => {
            const playerKey = p.playerKey ?? p.userId;
            const locked = Date.now() >= TOURNAMENT_START_AT;
            if (isCaptain && editingUserId === playerKey) {
              return (
                <Card key={playerKey} style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={styles.avatarWrap}>
                    {p.selfieUrl ? (
                      <LoadingImage source={{ uri: p.selfieUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{p.displayName.slice(0, 2).toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontWeight: "600", flex: 1 }} numberOfLines={1}>{p.displayName}{p.isCaptain ? " (C)" : ""}</Text>
                  <TextInput
                    autoFocus
                    value={draft}
                    onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, "").slice(0, 3))}
                    keyboardType="number-pad"
                    style={styles.jerseyInput}
                  />
                  <TouchableOpacity onPress={() => saveNumber(playerKey)} style={styles.saveBtn}>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setEditingUserId(null); setError(null); }}>
                    <Text style={{ color: theme.color.textMuted, fontSize: 12 }}>Cancel</Text>
                  </TouchableOpacity>
                </Card>
              );
            }
            return (
              <RosterTile
                key={playerKey}
                player={p}
                onPress={() => setOpenPlayer(p)}
                suspended={computePlayerSuspension(games, team.id, playerKey).suspended}
                onJerseyPress={isCaptain ? () => { setEditingUserId(playerKey); setDraft(String(p.jerseyNumber ?? "")); setError(null); } : undefined}
                jerseyLocked={locked}
              />
            );
          })}
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
          {teamGames.map((g) => {
            const isHome = g.homeTeamId === team.id;
            const opponent = teamById.get(isHome ? g.awayTeamId : g.homeTeamId);
            const opponentLabel =
              opponent?.name ??
              provisionalSideLabel(isHome ? g.awayDrawPos : g.homeDrawPos, isHome ? g.awayRef : g.homeRef) ??
              "TBD";
            const homeGoals = g.homeScore ?? 0;
            const awayGoals = g.awayScore ?? 0;
            return (
              <Card
                key={g.id}
                onPress={() => navigation.navigate("Game", { gameId: g.id })}
                style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
              >
                <View>
                  <Text style={{ fontSize: 11.5, color: theme.color.textMuted, marginBottom: 2 }}>
                    {dayDateLabel(g.day)} · {g.field}
                  </Text>
                  <Text style={{ fontWeight: "600", fontSize: 14.5 }}>
                    {isHome ? "vs" : "@"} {opponentLabel}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <StatusBadge status={g.status} />
                  <Text style={{ fontWeight: "800", fontSize: 16, marginTop: 4 }}>
                    {g.status === "scheduled" ? formatKickoffTime(g.kickoffTime) : `${homeGoals}–${awayGoals}`}
                  </Text>
                </View>
              </Card>
            );
          })}
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
                {m.mediaUrl && m.mediaType && (
                  <ChannelAttachmentThumb mediaUrl={m.mediaUrl} mediaType={m.mediaType} onPress={() => setLightbox({ uri: m.mediaUrl!, mediaType: m.mediaType! })} />
                )}
                {m.text ? <Text style={{ fontSize: 13.5, color: m.from === "admin" ? "#fff" : theme.color.text, marginTop: m.mediaUrl ? 6 : 0 }}>{m.text}</Text> : null}
              </View>
            ))}
            {channelMessages.length === 0 && (
              <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
                {canPostToChannel ? "No messages yet — send the first one to your organizers below." : "No messages yet."}
              </Text>
            )}
          </View>

          {canPostToChannel ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
              <ChannelAttachButton value={channelAttachment} onChange={setChannelAttachment} disabled={sending} />
              <TextInput
                value={channelDraft}
                onChangeText={setChannelDraft}
                placeholder={channelMessages.length === 0 ? "Message your organizers…" : "Send a message…"}
                style={styles.channelInput}
              />
              <PrimaryButton disabled={sending || (!channelDraft.trim() && !channelAttachment)} onPress={sendChannelMessage}>Send</PrimaryButton>
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
  avatarWrap: { width: 36, height: 36 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: theme.color.purple, alignItems: "center", justifyContent: "center" },
  momentTile: { width: 84, height: 84, borderRadius: 8 },
  momentTileVideo: { backgroundColor: theme.color.navy, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", padding: 18, backgroundColor: "#F7F6F3", borderRadius: 10 },
  channelBubble: { borderRadius: 10, padding: 10, maxWidth: "80%" },
  channelInput: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
});
