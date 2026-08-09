import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { FIELD_CLUSTERS, PRIVATE_GAME_FIELD, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * Pixel-position hotspots (as % of the 745×558 venue map image) for each
 * numbered field the tournament actually uses — same coordinates as web's
 * FieldMap, read off the real Maryland SoccerPlex complex map (Umoja13
 * Toddler Camp schedule PDF, page 3). Fields not in this tournament's set
 * (1-4, 6-8, 10-11, 18-24) are shown on the map for orientation but have no
 * hotspot — nothing is scheduled there.
 */
const MAP_HOTSPOTS: { cluster: string; label: string; xPct: number; yPct: number }[] = [
  { cluster: "Field 5", label: "5", xPct: 47.9, yPct: 15.1 },
  { cluster: "Field 9", label: "9", xPct: 32.9, yPct: 20.8 },
  { cluster: "Field 12", label: "12", xPct: 28.3, yPct: 20.8 },
  { cluster: "Field 13", label: "13", xPct: 25.4, yPct: 16.3 },
  { cluster: "Field 14", label: "14", xPct: 21.3, yPct: 27.2 },
  { cluster: "Field 15", label: "15", xPct: 17.2, yPct: 28.7 },
  { cluster: "Field 16", label: "16", xPct: 17.2, yPct: 35.7 },
  { cluster: "Field 17", label: "17", xPct: 21.6, yPct: 39.8 },
];

/**
 * The real venue map image, with a tappable hotspot on each numbered field
 * this tournament actually plays on — tapping one selects that cluster's
 * first sub-pitch, same as tapping its chip in the grid rendered underneath.
 */
function VenueMapImage({
  selectedCluster,
  onSelectCluster,
  large,
}: {
  selectedCluster: string | null;
  onSelectCluster: (cluster: string) => void;
  large: boolean;
}) {
  return (
    <View style={{ width: "100%", aspectRatio: 745 / 558, marginBottom: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: theme.color.border }}>
      <Image source={require("../../assets/soccerplex-map.png")} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
      {MAP_HOTSPOTS.map((h) => {
        const active = selectedCluster === h.cluster;
        const size = large ? 30 : 22;
        return (
          <TouchableOpacity
            key={h.cluster}
            activeOpacity={0.8}
            onPress={() => onSelectCluster(h.cluster)}
            style={{
              position: "absolute",
              left: `${h.xPct}%`,
              top: `${h.yPct}%`,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: active ? theme.color.purple : "#fff",
              backgroundColor: active ? theme.color.purple : "rgba(139,47,209,.28)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: large ? 12 : 10 }}>{h.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * A clickable grid of the tournament's actual sub-pitches — mirrors web's
 * FieldMap. Each numbered field (5, 9, 12-17) is really 2-3 concurrent
 * mini-pitches sharing that field, one per game format, so this shows the
 * fine-grained code (e.g. "12B") rather than just the field number — an
 * earlier version keyed only to the coarse cluster and could no longer
 * match any real game's `field` once games moved to sub-pitch codes. The
 * real venue map image sits above this grid, with hotspots on each
 * numbered field driving the exact same selection.
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
  const selectedCluster = selectedField ? FIELD_CLUSTERS.find((c) => c.pitches.includes(selectedField))?.cluster ?? null : null;

  function selectCluster(cluster: string) {
    const c = FIELD_CLUSTERS.find((fc) => fc.cluster === cluster);
    if (!c) return;
    const firstPitch = c.pitches[0];
    onSelectField(selectedCluster === cluster ? null : firstPitch);
  }

  return (
    <View style={{ maxWidth: large ? 480 : 320, alignSelf: "center", width: "100%" }}>
      <VenueMapImage selectedCluster={selectedCluster} onSelectCluster={selectCluster} large={large} />
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
