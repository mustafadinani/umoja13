import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { FESTIVAL_CATEGORY_IDS, type RegistrationCategoryBucket, type Team } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGames, useTeams } from "../hooks/useData";
import { useRegistrationCategoryBuckets } from "../hooks/useRegistration";
import { Card, Pill, StatusBadge } from "../components/ui";

/**
 * On first mount, this row's Pills size themselves correctly (their width
 * already reflects the real label) but leave the text glyphs unpainted until
 * something forces a real native update — confirmed by screen recording:
 * labels stayed blank until the user tapped a chip (which changes each
 * Pill's active/color prop), and re-blanked on every subsequent fresh mount.
 * A same-props re-render doesn't help (React sees no diff and skips the
 * native update) — nudging the ScrollView's actual scroll position by a
 * pixel and back forces iOS to recomposite the content, which reliably
 * unsticks the stuck text layer.
 */
function CategoryChipRow({
  buckets,
  categoryId,
  onSelect,
  showAll,
}: {
  buckets: RegistrationCategoryBucket[];
  categoryId: string | null;
  onSelect: (id: string | null) => void;
  /** Schedule keeps an "All" chip; Standings always picks a concrete bucket. */
  showAll: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: 1, animated: false });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: 0, animated: false }));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator
      style={styles.chipRow}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingRight: 32, paddingVertical: 12 }}
    >
      {showAll && (
        <Pill active={!categoryId} bg={!categoryId ? theme.color.purple : undefined} onPress={() => onSelect(null)}>
          All
        </Pill>
      )}
      {buckets.map((c) => (
        <Pill
          key={c.id}
          active={categoryId === c.id}
          bg={categoryId === c.id ? theme.color.purple : undefined}
          onPress={() => onSelect(c.id)}
        >
          {c.label} ({c.count})
        </Pill>
      ))}
    </ScrollView>
  );
}

export function GamesScreen({ navigation }: BottomTabScreenProps<any>) {
  const { buckets } = useRegistrationCategoryBuckets();
  const [seg, setSeg] = useState<"schedule" | "standings">("schedule");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: games } = useGames();
  const { data: allTeams } = useTeams();

  // Standings always uses a concrete bucket (same as web). Schedule may use All.
  useEffect(() => {
    if (seg !== "standings") return;
    if (buckets.length === 0) {
      setCategoryId(null);
      return;
    }
    if (!categoryId || !buckets.some((b) => b.id === categoryId)) {
      setCategoryId(buckets[0].id);
    }
  }, [seg, buckets, categoryId]);

  const standingsCategoryId =
    seg === "standings" ? categoryId ?? buckets[0]?.id ?? null : categoryId;
  const activeBucket = buckets.find((b) => b.id === standingsCategoryId) ?? null;
  const { data: teams } = useTeams(standingsCategoryId ?? undefined);

  const isFestival = standingsCategoryId ? FESTIVAL_CATEGORY_IDS.includes(standingsCategoryId) : false;
  const filteredGames = games.filter((g) => !categoryId || g.categoryId === categoryId);
  const teamMap = useMemo(() => new Map(allTeams.map((t) => [t.id, t])), [allTeams]);

  const grouped = useMemo(() => {
    const hasRealGroups = teams.some((t) => t.group === "A" || t.group === "B");
    if (!hasRealGroups) {
      const sorted = [...teams].sort(
        (a, b) =>
          (a.stats.groupRank ?? 99) - (b.stats.groupRank ?? 99) || a.name.localeCompare(b.name)
      );
      return new Map<string, Team[]>([["", sorted]]);
    }
    const byGroup = new Map<string, Team[]>();
    for (const t of teams) {
      const key = t.group ?? "Unassigned";
      byGroup.set(key, [...(byGroup.get(key) ?? []), t]);
    }
    for (const [key, list] of byGroup) {
      byGroup.set(
        key,
        [...list].sort(
          (a, b) =>
            (a.stats.groupRank ?? 99) - (b.stats.groupRank ?? 99) || a.name.localeCompare(b.name)
        )
      );
    }
    return byGroup;
  }, [teams]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>GAME DAY</Text>
        <View style={styles.segRow}>
          <Pill active={seg === "schedule"} onPress={() => setSeg("schedule")}>SCHEDULE</Pill>
          <Pill active={seg === "standings"} onPress={() => setSeg("standings")}>STANDINGS</Pill>
        </View>
        <Text style={styles.filterLabel}>FILTER BY CATEGORY</Text>
        <CategoryChipRow
          buckets={buckets}
          categoryId={seg === "standings" ? standingsCategoryId : categoryId}
          onSelect={setCategoryId}
          showAll={seg === "schedule"}
        />
      </View>
      <View style={styles.divider} />

      <ScrollView style={{ padding: 16 }}>
        {seg === "schedule" ? (
          filteredGames.length === 0 ? (
            <Text style={{ color: theme.color.textMuted }}>No games in this category yet.</Text>
          ) : (
            filteredGames.map((g) => (
              <Card key={g.id} onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "600", flex: 1 }}>
                    {teamMap.get(g.homeTeamId)?.name ?? "TBD"} vs {teamMap.get(g.awayTeamId)?.name ?? "TBD"}
                  </Text>
                  <StatusBadge status={g.status} />
                </View>
                <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 4 }}>
                  {g.field} · {g.day.toUpperCase()} {g.kickoffTime}
                </Text>
              </Card>
            ))
          )
        ) : (
          <>
            {activeBucket && !activeBucket.matched && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "700" }}>Unmapped registration category</Text>
                <Text style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                  These teams registered under "{activeBucket.label}", which doesn't match a tournament category. An
                  admin can fix each team in Admin → Teams on web.
                </Text>
              </Card>
            )}

            {isFestival && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "700" }}>Festival format — every player medals!</Text>
                <Text style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                  This category doesn't track W-D-L. Teams registered here are listed below.
                </Text>
              </Card>
            )}

            {teams.length === 0 ? (
              <Text style={{ color: theme.color.textMuted }}>No teams in this category yet.</Text>
            ) : (
              [...grouped.entries()].map(([group, list]) => (
                <View key={group || "all"} style={{ marginBottom: 16 }}>
                  {group ? (
                    <Text style={styles.groupTitle}>GROUP {group}</Text>
                  ) : (
                    <Text style={styles.groupTitle}>TEAMS ({list.length})</Text>
                  )}
                  {list.map((t, i) => (
                    <Card
                      key={t.id}
                      onPress={() => navigation.getParent()?.navigate("Team", { teamId: t.id })}
                      style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <Text style={{ fontWeight: "700", flex: 1 }}>
                        #{t.stats.groupRank ?? i + 1} {t.name}
                      </Text>
                      {!isFestival && (
                        <Text style={{ color: theme.color.textMuted }}>
                          {t.stats.wins}-{t.stats.draws}-{t.stats.losses} · {t.stats.points} pts
                        </Text>
                      )}
                    </Card>
                  ))}
                </View>
              ))
            )}
          </>
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
  filterLabel: { fontSize: 10.5, fontWeight: "800", color: theme.color.textMuted, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  chipRow: { flexGrow: 0, marginHorizontal: -16, marginBottom: 4 },
  groupTitle: { fontWeight: "800", fontSize: 14, marginBottom: 8, color: theme.color.text },
});
