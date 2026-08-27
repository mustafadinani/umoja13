import { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LoadingImage } from "../components/LoadingImage";
import { COLLECTIONS, parseMomentEmbedUrl, youtubeThumbnailUrl, type Moment } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMoments, useMyMoments } from "../hooks/useData";
import { PrimaryButton } from "../components/ui";
import { MomentDetailModal } from "../components/MomentDetailModal";
import { MomentUploadModal } from "../components/MomentUploadModal";

const SOURCE_BADGE: Record<string, string> = { game: "⚽", hunt: "🧭", community: "🎉" };

const COLUMNS = 3;
const GAP = 2;
const TILE_SIZE = (Dimensions.get("window").width - GAP * (COLUMNS - 1)) / COLUMNS;

export function MomentsScreen() {
  const { user } = useAuth();
  const { data: approvedMoments } = useMoments();
  const { data: myMoments } = useMyMoments(user?.uid);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openMomentId, setOpenMomentId] = useState<string | null>(null);

  // Public approved feed plus the signed-in user's own posts regardless of
  // moderation status — otherwise a pending/rejected post just vanishes on
  // the poster with no indication it was ever received.
  const moments = useMemo(() => {
    const byId = new Map<string, Moment>(approvedMoments.map((m) => [m.id, m]));
    for (const m of myMoments) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  }, [approvedMoments, myMoments]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>MOMENTS</Text>
        <PrimaryButton onPress={() => setUploadOpen(true)}>+ SHARE</PrimaryButton>
      </View>
      <FlatList
        data={moments}
        keyExtractor={(m) => m.id}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ gap: GAP, backgroundColor: theme.color.border }}
        renderItem={({ item: m }) => {
          const isOwn = user?.uid === m.postedBy;
          const showStatus = isOwn && m.moderationStatus !== "approved";
          // Embeds get a free thumbnail from YouTube's predictable image URL
          // (no API call) — Vimeo has no equivalent, so it falls back to the
          // same navy placeholder a video-with-no-thumbnail already uses.
          const embedInfo = m.mediaType === "embed" ? parseMomentEmbedUrl(m.mediaUrl) : null;
          const embedThumb = embedInfo?.platform === "youtube" ? youtubeThumbnailUrl(embedInfo.videoId) : null;
          const imageSrc = embedThumb ?? (m.mediaType === "photo" ? m.mediaUrl : null);
          return (
            <TouchableOpacity style={styles.tile} onPress={() => setOpenMomentId(m.id)} activeOpacity={0.85}>
              {imageSrc ? (
                <LoadingImage source={{ uri: imageSrc }} style={styles.tileImage} />
              ) : (
                <View style={[styles.tileImage, { backgroundColor: theme.color.navy }]} />
              )}
              {m.mediaUrl && (m.mediaType === "video" || m.mediaType === "embed") && (
                <Text style={styles.playIcon}>{m.mediaType === "embed" ? "🔗" : "▶"}</Text>
              )}
              <Text style={styles.badge}>{SOURCE_BADGE[m.source] ?? "•"}</Text>
              {showStatus ? (
                <View style={[styles.statusPill, { backgroundColor: m.moderationStatus === "pending" ? theme.color.warning : theme.color.danger }]}>
                  <Text style={styles.statusPillText}>{m.moderationStatus === "pending" ? "PENDING" : "NOT APPROVED"}</Text>
                </View>
              ) : (
                m.likeUids.length > 0 && (
                  <View style={styles.likesPill}>
                    <Text style={styles.likesPillText}>♥ {m.likeUids.length}</Text>
                  </View>
                )
              )}
              {!!m.caption && (
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.captionScrim}>
                  <Text style={styles.captionText} numberOfLines={1}>{m.caption}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {uploadOpen && <MomentUploadModal onClose={() => setUploadOpen(false)} />}
      <MomentDetailModal moment={moments.find((m) => m.id === openMomentId) ?? null} onClose={() => setOpenMomentId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "800", fontSize: 24 },
  tile: { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: "#fff", overflow: "hidden" },
  tileImage: { width: "100%", height: "100%" },
  playIcon: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    textAlign: "center", textAlignVertical: "center", fontSize: 22, color: "#fff",
    textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4,
  },
  badge: { position: "absolute", top: 5, left: 5, fontSize: 13 },
  captionScrim: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 6, paddingTop: 14, paddingBottom: 5 },
  captionText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
  likesPill: { position: "absolute", top: 5, right: 5, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  likesPillText: { color: "#fff", fontSize: 9.5, fontWeight: "700" },
  statusPill: { position: "absolute", top: 5, right: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { color: "#fff", fontSize: 8.5, fontWeight: "800" },
});
