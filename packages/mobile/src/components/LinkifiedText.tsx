import { Fragment } from "react";
import { Text, Linking, type TextStyle, type StyleProp } from "react-native";
import { linkifyText } from "@umoja/shared";
import { theme } from "../lib/theme";

/** Renders free text with any http(s) URL turned into a real, tappable link — see linkifyText. */
export function LinkifiedText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      {linkifyText(text).map((seg, i) => (
        <Fragment key={i}>
          {seg.url ? (
            <Text
              style={{ color: theme.color.blue, fontWeight: "600" }}
              onPress={() => Linking.openURL(seg.url!).catch(() => {})}
            >
              {seg.text}
            </Text>
          ) : (
            seg.text
          )}
        </Fragment>
      ))}
    </Text>
  );
}
