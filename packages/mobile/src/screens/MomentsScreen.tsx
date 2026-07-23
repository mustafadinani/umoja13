import { useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { COLLECTIONS, MOMENT_TAGS } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMoments } from "../hooks/useData";
import { Modal, Pill, PrimaryButton } from "../components/ui";

const SOURCE_BADGE: Record<string, string> = { game: "⚽", hunt: "🧭", community: "🎉" };

export function MomentsScreen() {
  const { user } = useAuth();
  const { data: moments } = useMoments();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        postedBy: user.uid,
        postedByName: user.displayName ?? "Fan",
        source: "community",
        likeUids: [],
        moderationStatus: "pending",
        createdAt: Date.now(),
      });
      setUploadOpen(false);
      setUri(null);
      setTag(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post your moment.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(momentId: string, liked: boolean) {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.moments, momentId), { likeUids: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
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
            <View style={styles.tile}>
              {m.mediaUrl ? <Image source={{ uri: m.mediaUrl }} style={styles.tileImage} /> : <View style={[styles.tileImage, { backgroundColor: theme.color.purple }]} />}
              <Text style={styles.badge}>{SOURCE_BADGE[m.source] ?? "•"}</Text>
              <View style={{ padding: 8 }}>
                <Text style={{ fontWeight: "600", fontSize: 12 }} numberOfLines={1}>{m.caption}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <TouchableOpacity onPress={() => toggleLike(m.id, liked)}>
                    <Text style={{ color: liked ? theme.color.pink : theme.color.textMuted, fontSize: 12 }}>{liked ? "♥" : "♡"} {m.likeUids.length}</Text>
                  </TouchableOpacity>
                  {isOwn && <TouchableOpacity onPress={() => remove(m.id)}><Text style={{ color: theme.color.danger, fontSize: 11 }}>Delete</Text></TouchableOpacity>}
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={uploadOpen} onClose={() => setUploadOpen(false)}>
        <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Share a moment</Text>
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: 180, borderRadius: 8, marginBottom: 12 }} />
        ) : (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <PrimaryButton onPress={() => pickImage(true)} style={{ flex: 1 }}>📷 Camera</PrimaryButton>
            <PrimaryButton onPress={() => pickImage(false)} style={{ flex: 1 }}>🖼 Library</PrimaryButton>
          </View>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {MOMENT_TAGS.map((t) => <Pill key={t} active={tag === t} onPress={() => setTag(t)}>{t}</Pill>)}
        </View>
        {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</Text>}
        <PrimaryButton disabled={!uri || !tag || posting} onPress={post} style={{ width: "100%" }}>
          {posting ? "Posting…" : "POST MOMENT"}
        </PrimaryButton>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "800", fontSize: 24 },
  tile: { flex: 1, margin: 6, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: theme.color.border },
  tileImage: { width: "100%", height: 100 },
  badge: { position: "absolute", top: 6, left: 6, fontSize: 16 },
});
