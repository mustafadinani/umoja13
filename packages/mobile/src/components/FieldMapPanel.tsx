import { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CATEGORIES, compareGamesLiveFirst, formatKickoffTime, type Game, type Team } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Card, Pill, StatusBadge } from "./ui";
import { FieldMap } from "./FieldMap";

/**
 * The Games tab's third tab. `allGames` (unfiltered) drives the map's field
 * coloring so a field never renders green for a category that isn't
 * actually live there; `games` (category-filtered, same chips as the other
 * two tabs) drives the feed underneath. Tapping a field narrows the feed
 * further without touching the map's own coloring.
 */
export function FieldMapPanel({ games, allGames, teamMap }: { games: Game[]; allGames: Game[]; teamMap: Map<string, Team> }) {
  const navigation = useNavigation<any>();
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const feed = useMemo(
    () =>
      games
        .filter((g) => g.status === "live" || g.status === "scheduled")
        .filter((g) => !selectedField || g.field === selectedField)
        .sort(compareGamesLiveFirst),
    [games, selectedField]
  );

  return (
    <View>
      <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 10 }}>
        Maryland SoccerPlex · tap a field to see what's playing on it
      </Text>
      <Card style={{ paddingVertical: 16 }}>
        <FieldMap games={allGames} selectedField={selectedField} onSelectField={setSelectedField} large />
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
          <LegendDot color={theme.color.success} label="Field" />
          <LegendDot color={theme.color.pink} label="Live now" />
          <LegendDot color={theme.color.purple} label="Selected" />
        </View>
      </Card>

      {selectedField && (
        <View style={{ alignItems: "center", marginTop: 10, marginBottom: 4 }}>
          <Pill active onPress={() => setSelectedField(null)}>Showing {selectedField} · clear ✕</Pill>
        </View>
      )}

      <Text style={styles.feedLabel}>{selectedField ? `ON ${selectedField.toUpperCase()}` : "ON NOW & NEXT"}</Text>
      {feed.length === 0 ? (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5, textAlign: "center", paddingVertical: 12 }}>
          Nothing scheduled here right now.
        </Text>
      ) : (
        feed.map((g) => {
          const home = teamMap.get(g.homeTeamId);
          const away = teamMap.get(g.awayTeamId);
          return (
            <Card
              key={g.id}
              onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })}
              style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: "700", fontSize: 13.5 }}>
                  {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
                </Text>
                <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>
                  {CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId} · {g.field} ·{" "}
                  {g.status === "live" ? "LIVE" : `${g.day.toUpperCase()} ${formatKickoffTime(g.kickoffTime)}`}
                </Text>
              </View>
              <StatusBadge status={g.status} />
            </Card>
          );
        })
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 11.5, color: theme.color.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  feedLabel: { fontSize: 10.5, fontWeight: "800", color: theme.color.textMuted, letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
});
