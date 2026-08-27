import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMyPodTasks } from "../hooks/useData";
import { Card } from "./ui";
import { PodTaskDetailModal } from "./PodTaskDetailModal";

function formatDueDate(dueDate: string, todayStr: string): string {
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dueDate < todayStr ? `Overdue · was due ${label}` : `Due ${label}`;
}

/** Pod tasks assigned specifically to you, across every pod you're on — surfaced on the dashboard so you don't have to dig through each pod's Tasks tab to find what you owe. Renders nothing if you have no pending tasks. */
export function MyPodTasksSection() {
  const { user } = useAuth();
  const { data: tasks } = useMyPodTasks(user?.uid);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const pending = tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });
  const openTask = pending.find((t) => t.id === openTaskId) ?? null;

  if (pending.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16, marginBottom: 10 }}>TASKS DUE FROM YOU</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pending.map((t) => {
          const isOverdue = !!t.dueDate && t.dueDate < todayStr;
          return (
            <Card
              key={t.id}
              onClick={() => setOpenTaskId(t.id)}
              style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
            >
              <div style={{ fontWeight: 700, fontSize: 13.5, minWidth: 120 }}>{t.title}</div>
              {t.dueDate && (
                <div style={{ fontSize: 12, color: isOverdue ? theme.color.danger : theme.color.textMuted, fontWeight: isOverdue ? 700 : 400, whiteSpace: "nowrap" }}>
                  {formatDueDate(t.dueDate, todayStr)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {openTask && <PodTaskDetailModal task={openTask} onClose={() => setOpenTaskId(null)} />}
    </div>
  );
}
