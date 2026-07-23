import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Modal as RNModal } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { COLLECTIONS, type Moment } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";

const SOURCE_LABEL: Record<string, string> = { game: "⚽ Game moment", hunt: "🧭 Hunt submission", community: "🎉 Community" };

export function MomentDetailModal({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const isVideo = moment.mediaType === "video" && !!moment.mediaUrl;
  const player = useVideoPlayer(isVideo ? moment.mediaUrl! : null);

  useEffect(() => {
    if (!player || !isVideo) return;
    player.play();
    return () => player.pause();
  }, [player, isVideo]);

  const liked = user ? moment.likeUids.includes(user.uid) : false;
  const isOwn = user?.uid === moment.postedBy;

  async function toggleLike() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.moments, moment.id), { likeUids: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await deleteDoc(doc(db, COLLECTIONS.moments, moment.id));
    onClose();
  }

  return (
    <RNModal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <ScrollView bounces={false}>
            {moment.mediaUrl ? (
              isVideo ? (
                <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />
              ) : (
                <Image source={{ uri: moment.mediaUrl }} style={styles.media} resizeMode="cover" />
              )
            ) : (
              <View style={[styles.media, { backgroundColor: theme.color.purple }]} />
            )}
            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
                <Text style={{ fontWeight: "800", fontSize: 17, flex: 1 }}>{moment.caption}</Text>
                <Text style={{ fontSize: 11.5, color: theme.color.textMuted, fontWeight: "700" }}>{SOURCE_LABEL[moment.source] ?? moment.source}</Text>
              </View>
              <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 12 }}>Posted by {moment.postedByName}</Text>
              {moment.comment && (
                <View style={{ backgroundColor: "#F7F6F3", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 13.5 }}>{moment.comment}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <TouchableOpacity disabled={busy || !user} onPress={toggleLike} style={styles.likeBtn}>
                  <Text style={{ color: liked ? theme.color.pink : theme.color.text, fontWeight: "700", fontSize: 15 }}>
                    {liked ? "♥" : "♡"} {moment.likeUids.length} {moment.likeUids.length === 1 ? "like" : "likes"}
                  </Text>
                </TouchableOpacity>
                {isOwn && (
                  <TouchableOpacity onPress={remove}>
                    <Text style={{ color: theme.color.danger, fontWeight: "700", fontSize: 13 }}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(10,8,16,.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88%" },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.color.border, alignSelf: "center", marginTop: 8, marginBottom: 4 },
  media: { width: "100%", height: 280, backgroundColor: theme.color.bg },
  likeBtn: { paddingVertical: 4 },
});
