import { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { LoadingImage } from "../components/LoadingImage";
import { doc, deleteDoc } from "firebase/firestore";
import { COLLECTIONS, type Moment } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMoments, useMyMoments } from "../hooks/useData";
import { PrimaryButton } from "../components/ui";
import { MomentDetailModal } from "../components/MomentDetailModal";
import { MomentUploadModal } from "../components/MomentUploadModal";

const SOURCE_BADGE: Record<string, string> = { game: "⚽", hunt: "🧭", community: "🎉" };

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

  async function remove(momentId: string) {
    await deleteDoc(doc(db, COLLECTIONS.moments, momentId));
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>MOMENTS</Text>
        <PrimaryButton onPress={() => setUploadOpen(true)}>+ SHARE</PrimaryButton>
      </View>
      <FlatList
        data={moments}
        keyExtractor={(m) => m.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: m }) => {
          const liked = user ? m.likeUids.includes(user.uid) : false;
          const isOwn = user?.uid === m.postedBy;
          return (
            <TouchableOpacity style={styles.tile} onPress={() => setOpenMomentId(m.id)} activeOpacity={0.85}>
              {m.mediaUrl ? (
                m.mediaType === "video" ? (
                  <View style={[styles.tileImage, styles.videoPlaceholder]}>
                    <Text style={{ fontSize: 26 }}>▶</Text>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", marginTop: 2 }}>VIDEO</Text>
                  </View>
                ) : (
                  <LoadingImage source={{ uri: m.mediaUrl }} style={styles.tileImage} />
                )
              ) : (
                <View style={[styles.tileImage, { backgroundColor: theme.color.purple }]} />
              )}
              <Text style={styles.badge}>{SOURCE_BADGE[m.source] ?? "•"}</Text>
              {isOwn && m.moderationStatus !== "approved" && (
                <View style={[styles.statusBadge, { backgroundColor: m.moderationStatus === "pending" ? theme.color.warning : theme.color.danger }]}>
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
                    {m.moderationStatus === "pending" ? "PENDING" : "NOT APPROVED"}
                  </Text>
                </View>
              )}
              <View style={{ padding: 8 }}>
                <Text style={{ fontWeight: "600", fontSize: 12 }} numberOfLines={1}>{m.caption}</Text>
                {m.comment && <Text style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }} numberOfLines={2}>{m.comment}</Text>}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ color: liked ? theme.color.pink : theme.color.textMuted, fontSize: 12 }}>{liked ? "♥" : "♡"} {m.likeUids.length}</Text>
                  {isOwn && <TouchableOpacity onPress={() => remove(m.id)}><Text style={{ color: theme.color.danger, fontSize: 11 }}>Delete</Text></TouchableOpacity>}
                </View>
              </View>
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
  tile: { flex: 1, margin: 6, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: theme.color.border },
  tileImage: { width: "100%", height: 100 },
  videoPlaceholder: { backgroundColor: theme.color.navy, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 6, left: 6, fontSize: 16 },
  statusBadge: { position: "absolute", top: 78, left: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
});
