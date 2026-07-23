import { View, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { VideoView, type VideoPlayer, type VideoContentFit } from "expo-video";
import { useEvent } from "expo";
import { theme } from "../lib/theme";

/** A VideoView that overlays a spinner until the player reports it's ready to play. */
export function LoadingVideo({
  player,
  style,
  nativeControls = true,
  contentFit = "contain",
}: {
  player: VideoPlayer;
  style?: StyleProp<ViewStyle>;
  nativeControls?: boolean;
  contentFit?: VideoContentFit;
}) {
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const loading = status === "loading" || status === "idle";
  return (
    <View style={[styles.wrap, style]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={nativeControls} contentFit={contentFit} />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: theme.color.navy },
  overlay: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
});
