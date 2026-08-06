import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FIELD_BOXES, FIELD_MAP_BOX_WIDTH, FIELD_MAP_BOX_HEIGHT, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * A clickable schematic of the tournament's fields — the same FIELD_BOXES
 * layout web's SVG FieldMap draws, rendered here with plain absolutely-
 * positioned Views (percentage-based against a fixed-aspect-ratio box)
 * instead of react-native-svg, so no new native dependency is needed for a
 * simple grid of boxes.
 */
export function FieldMap({
  games,
  selectedField,
  onSelectField,
  large = false,
}: {
  games: Game[];
  selectedField: string | null;
  onSelectField: (field: string | null) => void;
  large?: boolean;
}) {
  return (
    <View style={[styles.canvas, { maxWidth: large ? 480 : 320 }]}>
      {FIELD_BOXES.map((f) => {
        const fieldGames = games.filter((g) => g.field === f.label);
        const isLive = fieldGames.some((g) => g.status === "live");
        const isSelected = selectedField === f.label;
        const bg = isSelected ? theme.color.purple : isLive ? theme.color.pink : theme.color.success;
        return (
          <TouchableOpacity
            key={f.label}
            activeOpacity={0.8}
            onPress={() => onSelectField(isSelected ? null : f.label)}
            style={[
              styles.box,
              {
                left: `${(f.x / FIELD_MAP_BOX_WIDTH) * 100}%`,
                top: `${(f.y / FIELD_MAP_BOX_HEIGHT) * 100}%`,
                width: `${(f.w / FIELD_MAP_BOX_WIDTH) * 100}%`,
                height: `${(f.h / FIELD_MAP_BOX_HEIGHT) * 100}%`,
                backgroundColor: bg,
                borderColor: isSelected ? theme.color.navy : "transparent",
                borderWidth: isSelected ? 2 : 0,
              },
            ]}
          >
            <Text style={styles.boxLabel} numberOfLines={1}>
              {f.label === "Stadium Field" ? "STADIUM" : f.label.replace("Field ", "")}
            </Text>
            {isLive && <View style={styles.liveDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: "100%",
    aspectRatio: FIELD_MAP_BOX_WIDTH / FIELD_MAP_BOX_HEIGHT,
    alignSelf: "center",
    position: "relative",
  },
  box: {
    position: "absolute",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  boxLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  liveDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.color.danger,
  },
});
