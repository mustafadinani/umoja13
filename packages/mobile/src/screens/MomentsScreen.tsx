import { useMemo, useState } from "react";
import { View, Text, FlatList, Image, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, deleteDoc } from "firebase/firestore";
import { COLLECTIONS, MOMENT_TAGS, type Moment } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMoments, useMyMoments } from "../hooks/useData";
import { Modal, Pill, PrimaryButton } from "../components/ui";
import { MomentDetailModal } from "../components/MomentDetailModal";

const SOURCE_BADGE: Record<string, string> = { game: "⚽", hunt: "🧭", community: "🎉" };

export function MomentsScreen() {
  const { user } = useAuth();
  const { data: approvedMoments } = useMoments();
  const { data: myMoments } = useMyMoments(user?.uid);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [openMomentId, setOpenMomentId] = useState<string | null>(null);

  // Public approved feed plus the signed-in user's own posts regardless of
  // moderation status — otherwise a pending/rejected post just vanishes on
  // the poster with no indication it was ever received.
  const moments = useMemo(() => {
    const byId = new Map<string, Moment>(approvedMoments.map((m) => [m.id, m]));
    for (const m of myMoments) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  }, [approvedMoments, myMoments]);

  async function pickImage(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
  }

  async function post() {
    if (!uri || !tag || !user) return;
    setPosting(true);
    setError(null);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const isVideo = uri.endsWith(".mov") || uri.endsWith(".mp4");
      const path = `moments/${user.uid}/${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: isVideo ? "video/mp4" : "image/jpeg" });
      const mediaUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, COLLECTIONS.moments), {
        mediaType: isVideo ? "video" : "photo",
        mediaUrl,
        caption: tag,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        postedBy: user.uid,
        postedByName: user.displayName ?? "Fan",
        source: "community",
        likeUids: [],
        moderationStatus: "pending",
        createdAt: Date.now(),
      });
      setPosted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post your moment.");
    } finally {
      setPosting(false);
    }
  }

  function closeUpload() {
    setUploadOpen(false);
    setUri(null);
    setTag(null);
    setComment("");
    setPosted(false);
    setError(null);
  }

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
                  <Image source={{ uri: m.mediaUrl }} style={styles.tileImage} />
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

      <Modal visible={uploadOpen} onClose={closeUpload}>
        {posted ? (
          <View style={{ alignItems: "center", paddingVertical: 10 }}>
            <Text style={{ fontSize: 40 }}>✓</Text>
            <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Moment posted!</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, textAlign: "center" }}>
              A moderator will take a quick look, then it goes live on the wall.
            </Text>
            <PrimaryButton style={{ marginTop: 18, width: "100%" }} onPress={closeUpload}>DONE</PrimaryButton>
          </View>
        ) : (
          <>
            <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Share a moment</Text>
            {uri ? (
              <Image source={{ uri }} style={{ width: "100%", height: 180, borderRadius: 8, marginBottom: 12 }} />
            ) : (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <PrimaryButton onPress={() => pickImage(true)} style={{ flex: 1 }}>📷 Camera</PrimaryButton>
                <PrimaryButton onPress={() => pickImage(false)} style={{ flex: 1 }}>🖼 Library</PrimaryButton>
              </View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {MOMENT_TAGS.map((t) => <Pill key={t} active={tag === t} onPress={() => setTag(t)}>{t}</Pill>)}
            </View>
            <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Add a comment (optional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Say something about this moment…"
              multiline
              numberOfLines={2}
              style={styles.commentInput}
            />
            {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</Text>}
            <PrimaryButton disabled={!uri || !tag || posting} onPress={post} style={{ width: "100%" }}>
              {posting ? "Posting…" : "POST MOMENT"}
            </PrimaryButton>
          </>
        )}
      </Modal>
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
  commentInput: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 50, textAlignVertical: "top", marginBottom: 14 },
});
