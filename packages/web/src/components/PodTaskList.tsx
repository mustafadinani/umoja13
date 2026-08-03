import { CATEGORIES } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGamesByPod, useVolunteerTasksByPod } from "../hooks/useData";
import { Card, Pill, StatusBadge } from "./ui";

/**
 * Read-only rollup of everything tagged to this pod — games on its fields and
 * volunteer shifts assigned to it — so a pod's members have one place to see
 * "what's happening/needed here" without digging through the full admin
 * Games/Volunteers tabs. Claiming/completing a shift still happens through
 * the existing volunteer flow; this is visibility only.
 */
export function PodTaskList({ podId }: { podId: string }) {
  const { data: games } = useGamesByPod(podId);
  const { data: tasks } = useVolunteerTasksByPod(podId);

  const sortedGames = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const sortedTasks = [...tasks].sort((a, b) => a.time.localeCompare(b.time));

  if (sortedGames.length === 0 && sortedTasks.length === 0) {
    return <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Nothing tagged to this pod yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {sortedGames.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>GAMES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedGames.map((g) => (
              <Card key={g.id} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{g.day.toUpperCase()} · {g.field} · {g.kickoffTime}</div>
                </div>
                <StatusBadge status={g.status} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {sortedTasks.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>SHIFTS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedTasks.map((t) => (
              <Card key={t.id} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {t.time} · {t.location} {t.assigneeName ? `· ${t.assigneeName}` : "· Unassigned"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {t.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
                  {t.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
