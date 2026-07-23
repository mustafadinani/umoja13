import { memo, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { FESTIVAL_CATEGORY_IDS, type Category } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useCategories, useGames, useTeams } from "../hooks/useData";
import { Card, Pill, StatusBadge } from "../components/ui";

/**
 * Split out and memoized so this row doesn't re-render (and repaint every
 * Pill's text) every time an unrelated games/teams snapshot fires elsewhere
 * on this screen — e.g. a live game's score updating every few seconds.
 */
const CategoryChipRow = memo(function CategoryChipRow({
  categories,
  categoryId,
  onSelect,
}: {
  categories: Category[];
  categoryId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={styles.chipRow}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingRight: 32, paddingVertical: 12 }}
    >
      <Pill active={!categoryId} bg={!categoryId ? theme.color.purple : undefined} onPress={() => onSelect(null)}>All</Pill>
      {categories.map((c) => (
        <Pill key={c.id} active={categoryId === c.id} bg={categoryId === c.id ? theme.color.purple : undefined} onPress={() => onSelect(c.id)}>
          {c.label}
        </Pill>
      ))}
    </ScrollView>
  );
});

export function GamesScreen({ navigation }: BottomTabScreenProps<any>) {
  const { data: categories } = useCategories();
  const [seg, setSeg] = useState<"schedule" | "standings">("schedule");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: games } = useGames();
  const { data: teams } = useTeams(categoryId ?? undefined);

  const activeCategoryId = categoryId ?? categories[0]?.id ?? null;
  const isFestival = activeCategoryId ? FESTIVAL_CATEGORY_IDS.includes(activeCategoryId) : false;
  const filteredGames = games.filter((g) => !categoryId || g.categoryId === categoryId);
  const { data: allTeams } = useTeams();
  const teamMap = useMemo(() => new Map(allTeams.map((t) => [t.id, t])), [allTeams]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>GAME DAY</Text>
        <View style={styles.segRow}>
          <Pill active={seg === "schedule"} onPress={() => setSeg("schedule")}>SCHEDULE</Pill>
          <Pill active={seg === "standings"} onPress={() => setSeg("standings")}>STANDINGS</Pill>
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.filterLabel}>FILTER BY CATEGORY</Text>
      <CategoryChipRow categories={categories} categoryId={categoryId} onSelect={setCategoryId} />

      <ScrollView style={{ padding: 16 }}>
        {seg === "schedule" ? (
          filteredGames.map((g) => (
            <Card key={g.id} onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", flex: 1 }}>{teamMap.get(g.homeTeamId)?.name ?? "TBD"} vs {teamMap.get(g.awayTeamId)?.name ?? "TBD"}</Text>
                <StatusBadge status={g.status} />
              </View>
              <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 4 }}>{g.field} · {g.day.toUpperCase()} {g.kickoffTime}</Text>
            </Card>
          ))
        ) : isFestival ? (
          <Text style={{ color: theme.color.textMuted }}>Festival format — every player medals, no standings tracked.</Text>
        ) : (
          [...teams].sort((a, b) => (a.stats.groupRank ?? 99) - (b.stats.groupRank ?? 99)).map((t) => (
            <Card key={t.id} onPress={() => navigation.getParent()?.navigate("Team", { teamId: t.id })} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700" }}>#{t.stats.groupRank} {t.name}</Text>
              <Text style={{ color: theme.color.textMuted }}>{t.stats.wins}-{t.stats.draws}-{t.stats.losses} · {t.stats.points} pts</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 4 },
  title: { fontWeight: "800", fontSize: 24, marginBottom: 12 },
  segRow: { flexDirection: "row", gap: 8 },
  divider: { height: 1, backgroundColor: theme.color.border, marginTop: 16, marginHorizontal: 16 },
  filterLabel: { fontSize: 10.5, fontWeight: "800", color: theme.color.textMuted, letterSpacing: 0.5, marginTop: 14, marginBottom: 8, marginHorizontal: 16 },
  chipRow: { flexGrow: 0, marginBottom: 4 },
});
