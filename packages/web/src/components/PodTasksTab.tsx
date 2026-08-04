import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { usePod, usePodTasksByPod } from "../hooks/useData";
import { AddPodTaskModal } from "./AddPodTaskModal";
import { Card, PrimaryButton } from "./ui";

function formatDueDate(dueDate: string, todayStr: string): string {
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dueDate < todayStr ? `Overdue · was due ${label}` : `Due ${label}`;
}

/** General prep checklist for the pod — no time/location, toggleable by any pod member. */
export function PodTasksTab({ podId }: { podId: string }) {
  const { profile } = useAuth();
  const { data: pod } = usePod(podId);
  const { data: tasks } = usePodTasksByPod(podId);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!profile && !!pod?.memberUids.includes(profile.uid);
  const canAdd = isStaff || isPodMember;
  const todayStr = new Date().toISOString().slice(0, 10);
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt - a.createdAt;
  });

  async function toggleTaskDone(taskId: string, done: boolean) {
    await updateDoc(doc(db, COLLECTIONS.podTasks, taskId), { done: !done });
  }

  return (
    <div>
      {canAdd && (
        <div style={{ marginBottom: 16 }}>
          <PrimaryButton onClick={() => setAddTaskOpen(true)}>+ ADD TASK</PrimaryButton>
        </div>
      )}

      {sortedTasks.length === 0 && (
        <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No tasks on this pod yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sortedTasks.map((t) => {
          const canToggle = isStaff || isPodMember;
          const isOverdue = !t.done && !!t.dueDate && t.dueDate < todayStr;
          const details = [t.dueDate ? formatDueDate(t.dueDate, todayStr) : null, t.assigneeName].filter(Boolean).join(" · ");
          return (
            <Card key={t.id} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={t.done}
                disabled={!canToggle}
                onChange={() => toggleTaskDone(t.id, t.done)}
                style={{ width: 18, height: 18, cursor: canToggle ? "pointer" : "default" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, textDecoration: t.done ? "line-through" : "none", color: t.done ? theme.color.textMuted : theme.color.text }}>
                  {t.title}
                </div>
                {details && (
                  <div style={{ fontSize: 12, color: isOverdue ? theme.color.danger : theme.color.textMuted, fontWeight: isOverdue ? 700 : 400, marginTop: 2 }}>
                    {details}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {addTaskOpen && <AddPodTaskModal podId={podId} onClose={() => setAddTaskOpen(false)} />}
    </div>
  );
}
