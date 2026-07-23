import { useState } from "react";
import { Image, View, ActivityIndicator, StyleSheet, type ImageProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "../lib/theme";

/**
 * An Image that shows a spinner over itself while the remote source loads,
 * instead of freezing on a blank/stale frame. `style` sizes the wrapper
 * (which clips via overflow:hidden) — the Image itself always absolute-fills it.
 */
export function LoadingImage({ style, ...props }: ImageProps & { style?: StyleProp<ViewStyle> }) {
  const [loading, setLoading] = useState(true);
  return (
    <View style={[styles.wrap, style]}>
      <Image
        {...props}
        style={StyleSheet.absoluteFill}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
          <ActivityIndicator color={theme.color.purple} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: theme.color.bg },
  overlay: { alignItems: "center", justifyContent: "center", backgroundColor: theme.color.bg },
});
