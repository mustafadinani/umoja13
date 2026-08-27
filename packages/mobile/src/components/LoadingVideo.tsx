import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { VideoView, type VideoPlayer, type VideoContentFit } from "expo-video";
import { useEvent } from "expo";
import { theme } from "../lib/theme";

/**
 * A VideoView that overlays a spinner until the player reports it's ready to
 * play — and, when it instead reports `status: "error"` (bad/expired URL,
 * unsupported codec, a network hiccup mid-load, etc.), a real "couldn't load
 * this video" message with a retry button. Previously an error status fell
 * through neither the loading branch nor any error branch — the spinner
 * disappeared (status is no longer "loading") but the VideoView itself never
 * had anything to paint, so the whole tile just silently went blank with no
 * indication anything had gone wrong, and no way to try again short of
 * leaving and reopening the moment.
 */
export function LoadingVideo({
  player,
  style,
  nativeControls = true,
  contentFit = "contain",
  /** Same URL the player was constructed from — only needed so Retry can force a fresh load attempt via player.replace(). */
  source,
}: {
  player: VideoPlayer;
  style?: StyleProp<ViewStyle>;
  nativeControls?: boolean;
  contentFit?: VideoContentFit;
  source?: string | null;
}) {
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const loading = status === "loading" || status === "idle";
  const failed = status === "error";

  function retry() {
    if (source) player.replace(source);
    player.play();
  }

  return (
    <View style={[styles.wrap, style]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={nativeControls} contentFit={contentFit} />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
          <ActivityIndicator color="#fff" />
        </View>
      )}
      {failed && (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <Text style={styles.errorText}>⚠️ Couldn't load this video</Text>
          <TouchableOpacity onPress={retry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: theme.color.navy },
  overlay: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)" },
  errorText: { color: "#fff", fontWeight: "700", fontSize: 13, marginBottom: 10 },
  retryBtn: { backgroundColor: "rgba(255,255,255,.15)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
});
