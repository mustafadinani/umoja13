import { useEffect } from "react";
import { Modal as RNModal, Image, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

export function Lightbox({
  visible,
  src,
  mediaType = "photo",
  onClose,
}: {
  visible: boolean;
  src: string | null;
  mediaType?: "photo" | "video";
  onClose: () => void;
}) {
  const isVideo = mediaType === "video" && !!src;
  const player = useVideoPlayer(isVideo ? src : null);

  useEffect(() => {
    if (!player) return;
    if (visible && isVideo) player.play();
    else player.pause();
  }, [visible, isVideo, player]);

  return (
    <RNModal visible={visible && !!src} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        {src && isVideo ? (
          <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />
        ) : (
          src && <Image source={{ uri: src }} style={styles.media} resizeMode="contain" />
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: "#fff", fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(10,8,16,.94)", alignItems: "center", justifyContent: "center" },
  media: { width: "100%", height: "80%" },
  closeBtn: { position: "absolute", top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.15)", alignItems: "center", justifyContent: "center" },
});
