import { View, Text } from "react-native";
import { CATEGORIES } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGamesByPod, useVolunteerTasksByPod } from "../hooks/useData";
import { Card, Pill, StatusBadge } from "./ui";

/** Read-only rollup of games and volunteer shifts tagged to this pod — mirrors the web PodTaskList. */
export function PodTaskList({ podId }: { podId: string }) {
  const { data: games } = useGamesByPod(podId);
  const { data: tasks } = useVolunteerTasksByPod(podId);

  const sortedGames = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const sortedTasks = [...tasks].sort((a, b) => a.time.localeCompare(b.time));

  if (sortedGames.length === 0 && sortedTasks.length === 0) {
    return <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Nothing tagged to this pod yet.</Text>;
  }

  return (
    <View style={{ gap: 20 }}>
      {sortedGames.length > 0 && (
        <View>
          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>GAMES</Text>
          <View style={{ gap: 8 }}>
            {sortedGames.map((g) => (
              <Card key={g.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId}</Text>
                  <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{g.day.toUpperCase()} · {g.field} · {g.kickoffTime}</Text>
                </View>
                <StatusBadge status={g.status} />
              </Card>
            ))}
          </View>
        </View>
      )}

      {sortedTasks.length > 0 && (
        <View>
          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>SHIFTS</Text>
          <View style={{ gap: 8 }}>
            {sortedTasks.map((t) => (
              <Card key={t.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{t.title}</Text>
                  <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {t.time} · {t.location} {t.assigneeName ? `· ${t.assigneeName}` : "· Unassigned"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {t.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
                  {t.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
