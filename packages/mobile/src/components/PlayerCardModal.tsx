import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useMoments } from "../hooks/useData";
import { Drawer } from "./ui";
import { LoadingImage } from "./LoadingImage";
import { Lightbox } from "./Lightbox";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: "✓ Cleared to play", color: theme.color.success, bg: theme.color.successBg },
  pending_review: { label: "Pending review", color: theme.color.warning, bg: theme.color.warningBg },
  admin_review: { label: "Under admin review", color: theme.color.warning, bg: theme.color.warningBg },
  rejected: { label: "Not cleared", color: theme.color.danger, bg: theme.color.dangerBg },
  not_started: { label: "Check-in not started", color: theme.color.textMuted, bg: theme.color.bg },
};

export function PlayerCardModal({
  player,
  teamName,
  onClose,
}: {
  player: RosterEntry;
  teamName: string;
  onClose: () => void;
}) {
  const status = STATUS_LABEL[player.checkInStatus] ?? STATUS_LABEL.not_started;
  const { data: moments } = useMoments();
  const playerMoments = moments.filter((m) => m.playerTagUid === player.userId).sort((a, b) => b.createdAt - a.createdAt);
  const [lightbox, setLightbox] = useState<{ uri: string; mediaType: "photo" | "video" } | null>(null);

  return (
    <Drawer visible onClose={onClose}>
      <View style={{ alignItems: "center" }}>
        {player.selfieUrl ? (
          <LoadingImage source={{ uri: player.selfieUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 40 }}>{player.displayName.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{player.displayName}{player.isCaptain ? " (C)" : ""}</Text>
        <Text style={styles.team}>{teamName} · #{player.jerseyNumber ?? "—"}</Text>

        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={{ color: status.color, fontWeight: "700", fontSize: 13 }}>{status.label}</Text>
        </View>

        {(player.goals > 0 || player.assists > 0) && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{player.goals}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{player.assists}</Text>
              <Text style={styles.statLabel}>Assists</Text>
            </View>
          </View>
        )}

        {player.badges && player.badges.length > 0 && (
          <View style={[styles.badgeRow, playerMoments.length > 0 && { marginBottom: 20 }]}>
            {player.badges.map((b) => (
              <View key={b} style={styles.badge}>
                <Text style={{ fontSize: 11.5, fontWeight: "700", color: theme.color.purple }}>🏅 {b}</Text>
              </View>
            ))}
          </View>
        )}

        {playerMoments.length > 0 && (
          <View style={{ width: "100%" }}>
            <Text style={styles.momentsTitle}>MOMENTS</Text>
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
          </View>
        )}
      </View>
      <Lightbox visible={!!lightbox} src={lightbox?.uri ?? null} mediaType={lightbox?.mediaType} onClose={() => setLightbox(null)} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  photo: { width: 140, height: 140, borderRadius: 70, marginBottom: 14 },
  photoPlaceholder: { backgroundColor: theme.color.purple, alignItems: "center", justifyContent: "center" },
  name: { fontWeight: "800", fontSize: 20, textAlign: "center" },
  team: { color: theme.color.textMuted, fontSize: 13.5, marginTop: 4, marginBottom: 14 },
  statusPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 24, marginBottom: 14 },
  statBox: { alignItems: "center" },
  statValue: { fontWeight: "800", fontSize: 22, color: theme.color.text },
  statLabel: { fontSize: 11, color: theme.color.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  badge: { backgroundColor: "#F7F0FF", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  momentsTitle: { fontWeight: "800", fontSize: 15, marginBottom: 8 },
  momentsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  momentTile: { width: 84, height: 84, borderRadius: 8 },
  momentTileVideo: { backgroundColor: theme.color.navy, alignItems: "center", justifyContent: "center" },
});
