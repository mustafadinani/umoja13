import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { usePod, usePodTasksByPod } from "../hooks/useData";
import { PodTaskDetailModal } from "./PodTaskDetailModal";
import { Card } from "./ui";

function formatDueDate(dueDate: string, todayStr: string): string {
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dueDate < todayStr ? `Overdue · was due ${label}` : `Due ${label}`;
}

/** General prep checklist for the pod — no time/location, toggleable by any pod member. Task creation stays web-only, matching the rest of this app's admin tooling. */
export function PodTasksPanel({ podId }: { podId: string }) {
  const { profile } = useAuth();
  const { data: pod } = usePod(podId);
  const { data: tasks } = usePodTasksByPod(podId);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!profile && !!pod?.memberUids.includes(profile.uid);
  const canToggle = isStaff || isPodMember;
  const todayStr = new Date().toISOString().slice(0, 10);
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt - a.createdAt;
  });
  const openTask = sortedTasks.find((t) => t.id === openTaskId) ?? null;

  async function toggleTaskDone(taskId: string, done: boolean) {
    await updateDoc(doc(db, COLLECTIONS.podTasks, taskId), { done: !done });
  }

  return (
    <View style={{ padding: 14, gap: 8 }}>
      {sortedTasks.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No tasks on this pod yet.</Text>}
      {sortedTasks.map((t) => {
        const isOverdue = !t.done && !!t.dueDate && t.dueDate < todayStr;
        const details = [t.dueDate ? formatDueDate(t.dueDate, todayStr) : null, t.assigneeName].filter(Boolean).join(" · ");
        const commentCount = t.messages?.length ?? 0;
        return (
          <Card key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              disabled={!canToggle}
              onPress={() => toggleTaskDone(t.id, t.done)}
              style={{
                width: 22, height: 22, borderRadius: 5, borderWidth: 2, alignItems: "center", justifyContent: "center",
                borderColor: t.done ? theme.color.navy : theme.color.border, backgroundColor: t.done ? theme.color.navy : "transparent",
              }}
            >
              {t.done && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>✓</Text>}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 13.5, textDecorationLine: t.done ? "line-through" : "none", color: t.done ? theme.color.textMuted : theme.color.text }}>
                {t.title}
              </Text>
              {!!details && (
                <Text style={{ fontSize: 12, color: isOverdue ? theme.color.danger : theme.color.textMuted, fontWeight: isOverdue ? "700" : "400", marginTop: 2 }}>
                  {details}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setOpenTaskId(t.id)} style={{ padding: 6 }}>
              <Text style={{ color: theme.color.textMuted, fontSize: 12.5, fontWeight: "700" }}>
                💬 {commentCount > 0 ? commentCount : "Comment"}
              </Text>
            </TouchableOpacity>
          </Card>
        );
      })}
      {openTask && <PodTaskDetailModal task={openTask} canPost={canToggle} onClose={() => setOpenTaskId(null)} />}
    </View>
  );
}
