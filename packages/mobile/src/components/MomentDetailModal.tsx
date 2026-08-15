import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal as RNModal } from "react-native";
import { useVideoPlayer } from "expo-video";
import { WebView } from "react-native-webview";
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { COLLECTIONS, type Moment } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { LoadingImage } from "./LoadingImage";
import { LoadingVideo } from "./LoadingVideo";
import { Lightbox } from "./Lightbox";

const SOURCE_LABEL: Record<string, string> = { game: "⚽ Game moment", hunt: "🧭 Hunt submission", community: "🎉 Community" };

/**
 * Kept always-mounted with an internal visible toggle (never conditionally
 * mounted/unmounted by the caller) — matching Lightbox's pattern, since
 * tearing down a mounted expo-video player at the exact instant its parent
 * RNModal is also dismissing was crashing the app.
 */
export function MomentDetailModal({ moment, onClose }: { moment: Moment | null; onClose: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isVideo = moment?.mediaType === "video" && !!moment.mediaUrl;
  const isEmbed = moment?.mediaType === "embed" && !!moment.mediaUrl;
  const player = useVideoPlayer(isVideo ? moment!.mediaUrl! : null);

  useEffect(() => {
    if (!player || !isVideo) return;
    player.play();
    return () => player.pause();
  }, [player, isVideo]);

  useEffect(() => {
    if (!moment) setLightboxOpen(false);
  }, [moment]);

  const liked = user && moment ? moment.likeUids.includes(user.uid) : false;
  const isOwn = !!moment && user?.uid === moment.postedBy;

  async function toggleLike() {
    if (!user || !moment || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.moments, moment.id), { likeUids: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!moment) return;
    await deleteDoc(doc(db, COLLECTIONS.moments, moment.id));
    onClose();
  }

  return (
    <RNModal visible={!!moment} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        {moment && (
          <View style={styles.sheet}>
            <TouchableOpacity onPress={onClose} style={styles.grabberWrap} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}>
              <View style={styles.grabber} />
            </TouchableOpacity>
            <ScrollView bounces={false}>
              {moment.mediaUrl ? (
                isVideo ? (
                  <LoadingVideo player={player} source={moment.mediaUrl} style={styles.videoMedia} nativeControls contentFit="contain" />
                ) : isEmbed ? (
                  <WebView source={{ uri: moment.mediaUrl }} style={styles.videoMedia} allowsInlineMediaPlayback allowsFullscreenVideo />
                ) : (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setLightboxOpen(true)}>
                    <LoadingImage source={{ uri: moment.mediaUrl }} style={styles.media} resizeMode="cover" />
                  </TouchableOpacity>
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
          </View>
        )}
      </View>
      <Lightbox visible={lightboxOpen} src={moment?.mediaUrl ?? null} mediaType="photo" onClose={() => setLightboxOpen(false)} />
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(10,8,16,.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88%" },
  grabberWrap: { paddingVertical: 8, alignItems: "center" },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.color.border },
  media: { width: "100%", height: 280, backgroundColor: theme.color.bg },
  videoMedia: { width: "100%", height: 280 },
  likeBtn: { paddingVertical: 4 },
});
