import { Modal as RNModal, Image, TouchableOpacity, Text, StyleSheet } from "react-native";

/** Full-screen tap-to-view for a photo. Mobile has no working inline video
 * player yet (a separate, pre-existing gap), so this only handles photos. */
export function Lightbox({ visible, src, onClose }: { visible: boolean; src: string | null; onClose: () => void }) {
  return (
    <RNModal visible={visible && !!src} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        {src && <Image source={{ uri: src }} style={styles.media} resizeMode="contain" />}
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
