import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import {
  CATEGORIES,
  COLLECTIONS,
  FESTIVAL_CATEGORY_IDS,
  FORMAT_DESCRIPTIONS,
  TODDLERS_CAMP_CATEGORY_LABELS,
  TODDLER_CAMP_HIGHLIGHT_NOTE,
  TODDLER_CAMP_SCHEDULE,
  TOURNAMENT_DAY_DATES,
  compareByDayAndTime,
  compareGamesByKickoff,
  formatKickoffTime,
  provisionalSideLabel,
  seedDestination,
  type Game,
  type RegistrationCategoryBucket,
  type SeedDestination,
  type Team,
  type ToddlerCampSession,
} from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";

/** "FRI, AUG 14" — a bare day abbreviation alone doesn't say which one. */
function dayDateLabel(day: Game["day"]) {
  return `${day.toUpperCase()}, ${TOURNAMENT_DAY_DATES[day].toUpperCase()}`;
}
import { theme } from "../lib/theme";
import { useGames, useTeams } from "../hooks/useData";
import { useRegistrationCategoryBuckets } from "../hooks/useRegistration";
import { Card, Pill, StatusBadge } from "../components/ui";
import { FieldMapPanel } from "../components/FieldMapPanel";

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

const ROUND_LABELS: Record<Game["round"], string> = {
  group: "Group stage",
  wildcard: "Wild Card",
  qf: "Quarter-Final",
  sf: "Semi-Final",
  final: "Final",
};
const BRACKET_LABELS: Record<NonNullable<Game["bracket"]>, string> = {
  cup: "Cup",
  shield: "Shield",
  classic: "Classic",
};
const BRACKET_COLORS: Record<NonNullable<Game["bracket"]>, { fg: string; bg: string }> = {
  cup: { fg: theme.color.purple, bg: "rgba(139,47,209,.12)" },
  shield: { fg: theme.color.pink, bg: "rgba(236,59,99,.12)" },
  classic: { fg: theme.color.blue, bg: "rgba(37,99,235,.12)" },
};
const ELIMINATED_COLOR = { fg: theme.color.textMuted, bg: theme.color.bg };

type ScheduleRow = { kind: "game"; game: Game } | { kind: "camp"; session: ToddlerCampSession };

export function GamesScreen({ navigation }: BottomTabScreenProps<any>) {
  const { user, profile } = useAuth();
  const { buckets } = useRegistrationCategoryBuckets();
  const [seg, setSeg] = useState<"schedule" | "standings" | "fieldMap">("schedule");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: games } = useGames();
  const { data: allTeams } = useTeams();
  const followed = new Set(profile?.followedTeamIds ?? []);

  async function toggleFollow(teamId: string) {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
      followedTeamIds: followed.has(teamId) ? arrayRemove(teamId) : arrayUnion(teamId),
    });
  }

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
  const activeCategory = CATEGORIES.find((c) => c.id === standingsCategoryId) ?? null;
  const hasGroups = teams.some((t) => t.group === "A" || t.group === "B");
  const filteredGames = useMemo(
    () => games.filter((g) => !categoryId || g.categoryId === categoryId).sort(compareGamesByKickoff),
    [games, categoryId]
  );
  const teamMap = useMemo(() => new Map(allTeams.map((t) => [t.id, t])), [allTeams]);

  // Toddler Camp isn't a real tournament category — it has no Game docs, so
  // it's baked into the schedule feed here rather than shown as its own
  // section. Picking one of its two chips narrows to that age bracket (plus
  // the "All ages" sessions everyone attends); picking "All" merges every
  // session in; picking a real tournament category hides camp entirely,
  // same as it hides every other category's games.
  const campSessions = useMemo(() => {
    if (categoryId && TODDLERS_CAMP_CATEGORY_LABELS[categoryId]) {
      const bracketGroup: ToddlerCampSession["group"] = TODDLERS_CAMP_CATEGORY_LABELS[categoryId].includes("3 and 4")
        ? "Ages 3 & 4"
        : "Ages 5 & 6";
      return TODDLER_CAMP_SCHEDULE.filter((s) => s.group === bracketGroup || s.group === "All ages");
    }
    if (categoryId) return [];
    return TODDLER_CAMP_SCHEDULE;
  }, [categoryId]);

  const scheduleRows = useMemo(() => {
    const rows: ScheduleRow[] = [
      ...filteredGames.map((game): ScheduleRow => ({ kind: "game", game })),
      ...campSessions.map((session): ScheduleRow => ({ kind: "camp", session })),
    ];
    return rows.sort((a, b) =>
      compareByDayAndTime(
        a.kind === "game" ? { day: a.game.day, time: a.game.kickoffTime } : { day: a.session.day, time: a.session.start },
        b.kind === "game" ? { day: b.game.day, time: b.game.kickoffTime } : { day: b.session.day, time: b.session.start }
      )
    );
  }, [filteredGames, campSessions]);

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

  const bracketGames = useMemo(
    () => games.filter((g) => g.categoryId === standingsCategoryId && g.round !== "group").sort(compareGamesByKickoff),
    [games, standingsCategoryId]
  );
  const teamByIdActive = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const formatDescription = standingsCategoryId ? FORMAT_DESCRIPTIONS[standingsCategoryId] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>GAME DAY</Text>
        <View style={styles.segRow}>
          <Pill active={seg === "schedule"} onPress={() => setSeg("schedule")}>SCHEDULE</Pill>
          <Pill active={seg === "standings"} onPress={() => setSeg("standings")}>STANDINGS</Pill>
          <Pill active={seg === "fieldMap"} onPress={() => setSeg("fieldMap")}>FIELD MAP</Pill>
        </View>
        <Text style={styles.filterLabel}>FILTER BY CATEGORY</Text>
        <CategoryChipRow
          buckets={buckets}
          categoryId={seg === "standings" ? standingsCategoryId : categoryId}
          onSelect={setCategoryId}
          showAll={seg !== "standings"}
        />
      </View>
      <View style={styles.divider} />

      <ScrollView style={{ padding: 16 }}>
        {seg === "fieldMap" ? (
          <FieldMapPanel games={filteredGames} allGames={games} teamMap={teamMap} />
        ) : seg === "schedule" ? (
          scheduleRows.length === 0 ? (
            <Text style={{ color: theme.color.textMuted }}>No games in this category yet.</Text>
          ) : (
            scheduleRows.map((row) => {
              if (row.kind === "camp") return <CampSessionCard key={row.session.id} session={row.session} />;
              const g = row.game;
              const home = teamMap.get(g.homeTeamId);
              const away = teamMap.get(g.awayTeamId);
              const homeLabel = home?.name ?? provisionalSideLabel(g.homeDrawPos, g.homeRef) ?? "TBD";
              const awayLabel = away?.name ?? provisionalSideLabel(g.awayDrawPos, g.awayRef) ?? "TBD";
              return (
                <Card key={g.id} onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "600", flex: 1 }}>
                      <Text style={!home ? styles.provisional : undefined}>{homeLabel}</Text> vs{" "}
                      <Text style={!away ? styles.provisional : undefined}>{awayLabel}</Text>
                    </Text>
                    <StatusBadge status={g.status} />
                  </View>
                  <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 4 }}>
                    {g.field} · {dayDateLabel(g.day)} · {formatKickoffTime(g.kickoffTime)}
                  </Text>
                </Card>
              );
            })
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
                  {list.map((t, i) => {
                    const dest: SeedDestination | null =
                      !isFestival && !hasGroups && activeCategory
                        ? seedDestination(activeCategory.bracketTemplate, t.stats.groupRank ?? i + 1)
                        : null;
                    // Only tint when the outcome is actually known — a fixed Cup/Shield/Classic
                    // bracket, or genuine elimination. Still-alive-but-undetermined (headed to a
                    // Semi-Final/Quarter-Final/Wild Card) stays untinted rather than guessing.
                    const pathColor = dest?.bracket ? BRACKET_COLORS[dest.bracket] : dest?.eliminated ? ELIMINATED_COLOR : undefined;
                    return (
                      <Card
                        key={t.id}
                        onPress={() => navigation.getParent()?.navigate("Team", { teamId: t.id })}
                        style={{ marginBottom: 6, ...(pathColor ? { backgroundColor: pathColor.bg } : null) }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            {user && (
                              <TouchableOpacity onPress={() => toggleFollow(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 6 }}>
                                <Text style={{ fontSize: 15, color: followed.has(t.id) ? theme.color.gold : theme.color.textMuted }}>
                                  {followed.has(t.id) ? "★" : "☆"}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <Text style={{ fontWeight: "700", flex: 1 }}>
                              #{t.stats.groupRank ?? i + 1} {t.name}
                            </Text>
                          </View>
                          {!isFestival && (
                            <Text style={{ color: theme.color.textMuted }}>
                              {t.stats.wins}-{t.stats.draws}-{t.stats.losses} · {t.stats.points} pts
                            </Text>
                          )}
                        </View>
                        {dest && (
                          <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase", marginTop: 4, color: pathColor?.fg ?? theme.color.textMuted }}>
                            {dest.eliminated ? "Eliminated" : dest.label}
                          </Text>
                        )}
                      </Card>
                    );
                  })}
                </View>
              ))
            )}

            {!isFestival && activeBucket?.matched && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.groupTitle}>ROAD TO THE FINAL</Text>

                {formatDescription && (
                  <Card style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, lineHeight: 19 }}>
                      <Text style={{ fontWeight: "700" }}>Format: </Text>
                      {formatDescription.format}
                    </Text>
                    <Text style={{ fontSize: 13, lineHeight: 19, marginTop: 6 }}>
                      <Text style={{ fontWeight: "700" }}>Road to the Final: </Text>
                      {formatDescription.roadToFinal}
                    </Text>
                  </Card>
                )}

                {bracketGames.length === 0 ? (
                  <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>Bracket games are seeded once group play wraps up.</Text>
                ) : (
                  bracketGames.map((g) => {
                    const home = teamByIdActive.get(g.homeTeamId);
                    const away = teamByIdActive.get(g.awayTeamId);
                    const homeLabel = home?.name ?? provisionalSideLabel(g.homeDrawPos, g.homeRef) ?? "TBD";
                    const awayLabel = away?.name ?? provisionalSideLabel(g.awayDrawPos, g.awayRef) ?? "TBD";
                    return (
                      <Card key={g.id} onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })} style={{ marginBottom: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Text style={styles.roundBadge}>
                            {g.bracket ? `${BRACKET_LABELS[g.bracket]} ` : ""}{ROUND_LABELS[g.round]}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.color.textMuted }}>{g.field} · {dayDateLabel(g.day)} · {formatKickoffTime(g.kickoffTime)}</Text>
                        </View>
                        <Text style={{ fontWeight: "600", marginTop: 4 }}>
                          <Text style={!home ? styles.provisional : undefined}>{homeLabel}</Text> vs{" "}
                          <Text style={!away ? styles.provisional : undefined}>{awayLabel}</Text>
                        </Text>
                      </Card>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Same card shape as a Game row, but no teams/score — a training block or the Sunday exhibition instead. Sits inline in the merged schedule feed, not a separate section. */
function CampSessionCard({ session }: { session: ToddlerCampSession }) {
  return (
    <Card style={session.highlight ? { marginBottom: 8, borderColor: theme.color.purple, backgroundColor: "rgba(139,47,209,.06)" } : { marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "600", flex: 1 }}>
          🍼 {session.group} · {session.activity}
        </Text>
      </View>
      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 4 }}>
        {session.location} · {dayDateLabel(session.day)} · {formatKickoffTime(session.start)}
        {session.end ? `–${formatKickoffTime(session.end)}` : ""}
      </Text>
      {session.highlight && (
        <Text style={{ fontSize: 12, color: theme.color.purple, fontWeight: "700", marginTop: 6 }}>⭐ {TODDLER_CAMP_HIGHLIGHT_NOTE}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 4 },
  title: { fontWeight: "800", fontSize: 24, marginBottom: 12 },
  segRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  divider: { height: 1, backgroundColor: theme.color.border, marginTop: 16, marginHorizontal: 16 },
  filterLabel: { fontSize: 10.5, fontWeight: "800", color: theme.color.textMuted, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  chipRow: { flexGrow: 0, marginHorizontal: -16, marginBottom: 4 },
  groupTitle: { fontWeight: "800", fontSize: 14, marginBottom: 8, color: theme.color.text },
  provisional: { color: theme.color.textMuted, fontStyle: "italic", fontWeight: "500" },
  roundBadge: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.color.purple,
    backgroundColor: "rgba(139,47,209,.12)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
});
