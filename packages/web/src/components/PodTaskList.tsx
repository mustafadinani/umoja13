import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useGamesByPod, usePod, usePodTasksByPod, useVolunteerTasksByPod } from "../hooks/useData";
import { AddVolunteerTaskModal } from "../pages/dashboard/admin/AddVolunteerTaskModal";
import { AddPodTaskModal } from "./AddPodTaskModal";
import { Card, Pill, PrimaryButton, StatusBadge } from "./ui";

function formatDueDate(dueDate: string, todayStr: string): string {
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dueDate < todayStr ? `Overdue · was due ${label}` : `Due ${label}`;
}

/**
 * Rollup of everything tied to this pod, in two distinct kinds: general prep
 * TASKS (no time/location, toggleable by any pod member — a shared
 * checklist) and scheduled SHIFTS (time/location/assignee, toggleable only
 * by that shift's assignee or staff) — plus a read-only view of games on the
 * pod's fields. Staff can add either kind directly from here.
 */
export function PodTaskList({ podId }: { podId: string }) {
  const { profile } = useAuth();
  const { data: pod } = usePod(podId);
  const { data: games } = useGamesByPod(podId);
  const { data: shifts } = useVolunteerTasksByPod(podId);
  const { data: tasks } = usePodTasksByPod(podId);
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!profile && !!pod?.memberUids.includes(profile.uid);
  const sortedGames = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const sortedShifts = [...shifts].sort((a, b) => a.time.localeCompare(b.time));
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

  async function toggleShiftDone(shiftId: string, done: boolean) {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, shiftId), { done: !done });
  }

  return (
    <div>
      {isStaff && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <PrimaryButton onClick={() => setAddTaskOpen(true)}>+ ADD TASK</PrimaryButton>
          <PrimaryButton onClick={() => setAddShiftOpen(true)}>+ ADD SHIFT</PrimaryButton>
        </div>
      )}

      {sortedGames.length === 0 && sortedShifts.length === 0 && sortedTasks.length === 0 && (
        <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Nothing tagged to this pod yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {sortedTasks.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>TASKS</div>
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
          </div>
        )}

        {sortedShifts.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>SHIFTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedShifts.map((t) => {
                const canToggle = isStaff || t.assigneeUid === profile?.uid;
                return (
                  <Card key={t.id} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={t.done}
                      disabled={!canToggle}
                      onChange={() => toggleShiftDone(t.id, t.done)}
                      style={{ width: 18, height: 18, cursor: canToggle ? "pointer" : "default" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, textDecoration: t.done ? "line-through" : "none", color: t.done ? theme.color.textMuted : theme.color.text }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                        {t.time} · {t.location} {t.assigneeName ? `· ${t.assigneeName}` : "· Unassigned"}
                      </div>
                    </div>
                    {t.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

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
      </div>

      {addTaskOpen && <AddPodTaskModal podId={podId} onClose={() => setAddTaskOpen(false)} />}
      {addShiftOpen && <AddVolunteerTaskModal initialPodId={podId} onClose={() => setAddShiftOpen(false)} />}
    </div>
  );
}
