import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { LoadingImage } from "./LoadingImage";

/** A message bubble's inline photo/video thumbnail — tap to open in the Lightbox. Shared by every chat panel that renders attachments. No video thumbnail generation (same tradeoff Moments makes) — a solid placeholder + ▶ stands in until it's opened. */
export function ChannelAttachmentThumb({
  mediaUrl,
  mediaType,
  onPress,
}: {
  mediaUrl: string;
  mediaType: "photo" | "video";
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      {mediaType === "video" ? (
        <View style={styles.videoPlaceholder}>
          <Text style={{ fontSize: 20 }}>▶</Text>
        </View>
      ) : (
        <LoadingImage source={{ uri: mediaUrl }} style={styles.thumb} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 160, height: 160, borderRadius: 8 },
  videoPlaceholder: { width: 160, height: 160, borderRadius: 8, backgroundColor: theme.color.navy, alignItems: "center", justifyContent: "center" },
});
