import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FIELD_CLUSTERS, PRIVATE_GAME_FIELD, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * A clickable grid of the tournament's actual sub-pitches — mirrors web's
 * FieldMap. Each numbered field (5, 9, 12-17) is really 2-3 concurrent
 * mini-pitches sharing that field, one per game format, so this shows the
 * fine-grained code (e.g. "12B") rather than just the field number — an
 * earlier version keyed only to the coarse cluster and could no longer
 * match any real game's `field` once games moved to sub-pitch codes.
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
    <View style={{ maxWidth: large ? 480 : 320, alignSelf: "center", width: "100%" }}>
      <View style={styles.grid}>
        {FIELD_CLUSTERS.map((c) => (
          <View key={c.cluster} style={styles.cluster}>
            <Text style={styles.clusterLabel}>{c.cluster.toUpperCase()}</Text>
            <View style={{ gap: 5 }}>
              {c.pitches.map((pitch) => {
                const pitchGames = games.filter((g) => g.field === pitch);
                const isLive = pitchGames.some((g) => g.status === "live");
                const isSelected = selectedField === pitch;
                const bg = isSelected ? theme.color.purple : isLive ? theme.color.pink : theme.color.success;
                return (
                  <TouchableOpacity
                    key={pitch}
                    activeOpacity={0.8}
                    onPress={() => onSelectField(isSelected ? null : pitch)}
                    style={[styles.pitch, { backgroundColor: bg }]}
                  >
                    <Text style={styles.pitchLabel}>{pitch}</Text>
                    {pitch === PRIVATE_GAME_FIELD && <Text style={styles.lock}>🔒</Text>}
                    {isLive && <View style={styles.liveDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectField(selectedField === "Stadium Field" ? null : "Stadium Field")}
        style={[styles.stadium, selectedField === "Stadium Field" && { backgroundColor: theme.color.purple }]}
      >
        <Text style={[styles.stadiumLabel, selectedField === "Stadium Field" && { color: "#fff" }]}>STADIUM</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  cluster: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: theme.color.bg,
  },
  clusterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.color.textMuted,
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  pitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  pitchLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12.5,
  },
  lock: {
    fontSize: 10,
    opacity: 0.85,
  },
  liveDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.danger,
  },
  stadium: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: theme.color.bg,
  },
  stadiumLabel: {
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 14,
    color: theme.color.textMuted,
  },
});
