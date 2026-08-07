import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { computePlayerGameStats, type RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGames, useMoments } from "../hooks/useData";
import { CheckInStatusPill, Drawer, Pill, PrimaryButton, VerifiedBadge } from "./ui";
import { LoadingImage } from "./LoadingImage";
import { Lightbox } from "./Lightbox";
import { MomentUploadModal } from "./MomentUploadModal";

export function PlayerCardModal({
  player,
  teamId,
  teamName,
  /** Scoped to one game (Game Day) — leave undefined on the Team roster tab, where there's no single game to check it against. Mirrors RosterTile's own rule. */
  rosterChecked,
  onClose,
}: {
  player: RosterEntry;
  teamId: string;
  teamName: string;
  rosterChecked?: boolean;
  onClose: () => void;
}) {
  const { data: moments } = useMoments();
  const { data: games } = useGames();
  // playerKey, not the bare userId — moments are tagged per-child now.
  const playerKey = player.playerKey ?? player.userId;
  const playerMoments = moments.filter((m) => m.playerTagUids?.includes(playerKey)).sort((a, b) => b.createdAt - a.createdAt);
  const stats = computePlayerGameStats(games, teamId, playerKey);
  const [lightbox, setLightbox] = useState<{ uri: string; mediaType: "photo" | "video" } | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(false);

  return (
    <Drawer visible onClose={onClose}>
      <View style={{ alignItems: "center" }}>
        <View style={styles.photoWrap}>
          {player.selfieUrl ? (
            <LoadingImage source={{ uri: player.selfieUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 40 }}>{player.displayName.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          {player.checkInStatus === "approved" && <VerifiedBadge size={36} />}
        </View>
        <Text style={styles.name}>{player.displayName}{player.isCaptain ? " (C)" : ""}</Text>
        <Text style={styles.team}>{teamName} · #{player.jerseyNumber ?? "—"}</Text>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <CheckInStatusPill status={player.checkInStatus} />
          {player.checkInStatus === "approved" && rosterChecked !== undefined && (
            <Pill bg={rosterChecked ? theme.color.successBg : theme.color.warningBg} fg={rosterChecked ? theme.color.success : theme.color.warning}>
              {rosterChecked ? "Roster Checked" : "Not Roster Checked"}
            </Pill>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatBox icon="⚽" value={stats.gamesPlayed} label="Games" />
          <StatBox icon="🟨" value={stats.yellowCards} label="Yellow" />
          <StatBox icon="🟥" value={stats.redCards} label="Red" />
          <StatBox icon="★" value={stats.motmCount} label="MOTM" />
        </View>

        {player.lineOfWork && (
          <View style={styles.factCard}>
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Profession</Text>
              <Text style={styles.factValue}>{player.lineOfWork}</Text>
            </View>
          </View>
        )}

        {player.badges && player.badges.length > 0 && (
          <View style={[styles.badgeRow, { marginBottom: 20 }]}>
            {player.badges.map((b) => (
              <View key={b} style={styles.badge}>
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: theme.color.purple }}>🏅 {b}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ width: "100%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={styles.momentsTitle}>MOMENTS</Text>
            {playerMoments.length > 0 && (
              <Text onPress={() => setAddMomentOpen(true)} style={{ color: theme.color.purple, fontWeight: "700", fontSize: 12.5 }}>+ Add</Text>
            )}
          </View>

          {playerMoments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 10 }}>No moments tagged yet.</Text>
              <PrimaryButton onPress={() => setAddMomentOpen(true)}>+ ADD A MOMENT</PrimaryButton>
            </View>
          ) : (
            <View style={styles.momentsGrid}>
              {playerMoments.map((m) => (
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
      </View>
      <Lightbox visible={!!lightbox} src={lightbox?.uri ?? null} mediaType={lightbox?.mediaType} onClose={() => setLightbox(null)} />
      {addMomentOpen && (
        <MomentUploadModal
          onClose={() => setAddMomentOpen(false)}
          initialTeamTagIds={[teamId]}
          initialPlayerTagUids={[playerKey]}
        />
      )}
    </Drawer>
  );
}

function StatBox({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{icon} {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoWrap: { width: 140, height: 140, marginBottom: 14 },
  photo: { width: 140, height: 140, borderRadius: 70 },
  photoPlaceholder: { backgroundColor: theme.color.purple, alignItems: "center", justifyContent: "center" },
  name: { fontWeight: "800", fontSize: 20, textAlign: "center" },
  team: { color: theme.color.textMuted, fontSize: 13.5, marginTop: 4, marginBottom: 14 },
  statsRow: { flexDirection: "row", width: "100%", gap: 8, marginBottom: 14 },
  statBox: { flex: 1, alignItems: "center", backgroundColor: "#F7F6F3", borderRadius: 10, paddingVertical: 10 },
  statValue: { fontWeight: "800", fontSize: 18, color: theme.color.text },
  statLabel: { fontSize: 10, color: theme.color.textMuted, marginTop: 2, fontWeight: "700", textTransform: "uppercase" },
  factCard: { width: "100%", backgroundColor: "#F7F6F3", borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  factRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopColor: theme.color.border },
  factLabel: { color: theme.color.textMuted, fontSize: 12.5 },
  factValue: { fontWeight: "600", fontSize: 12.5 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  badge: { backgroundColor: "#F7F0FF", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  momentsTitle: { fontWeight: "800", fontSize: 15 },
  emptyState: { alignItems: "center", padding: 18, backgroundColor: "#F7F6F3", borderRadius: 10 },
  momentsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  momentTile: { width: 84, height: 84, borderRadius: 8 },
  momentTileVideo: { backgroundColor: theme.color.navy, alignItems: "center", justifyContent: "center" },
});
