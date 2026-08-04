import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, type VolunteerTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useGamesByPod, useMyPods, usePodTasksByPod, useVolunteerTasksByPod } from "../hooks/useData";
import { PodTaskDetailModal } from "./PodTaskDetailModal";
import { VolunteerTaskDetailModal } from "./VolunteerTaskDetailModal";
import { Card, Pill, StatusBadge } from "./ui";

function formatDueDate(dueDate: string, todayStr: string): string {
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dueDate < todayStr ? `Overdue · was due ${label}` : `Due ${label}`;
}

function Checkbox({ checked, disabled, onPress, size = 22 }: { checked: boolean; disabled: boolean; onPress: () => void; size?: number }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: checked ? theme.color.navy : theme.color.border,
        backgroundColor: checked ? theme.color.navy : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <Text style={{ color: "#fff", fontSize: size > 18 ? 13 : 11, fontWeight: "800" }}>✓</Text>}
    </TouchableOpacity>
  );
}

/** A shift's own internal checklist — separate from the pod-wide TASKS list, scoped to just this one shift. */
function ShiftSteps({ shift, canManage }: { shift: VolunteerTask; canManage: boolean }) {
  const [newStep, setNewStep] = useState("");
  const steps = shift.steps ?? [];

  async function addStep() {
    if (!newStep.trim()) return;
    const step = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: newStep.trim(), done: false };
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, shift.id), { steps: [...steps, step] });
    setNewStep("");
  }

  async function toggleStep(stepId: string) {
    const updated = steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, shift.id), { steps: updated });
  }

  if (steps.length === 0 && !canManage) return null;

  return (
    <View style={{ marginTop: 10, paddingLeft: 32, gap: 6 }}>
      {steps.map((s) => (
        <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Checkbox checked={s.done} disabled={!canManage} onPress={() => toggleStep(s.id)} size={17} />
          <Text style={{ fontSize: 12.5, textDecorationLine: s.done ? "line-through" : "none", color: s.done ? theme.color.textMuted : theme.color.text }}>
            {s.title}
          </Text>
        </View>
      ))}
      {canManage && (
        <TextInput
          value={newStep}
          onChangeText={setNewStep}
          onSubmitEditing={addStep}
          placeholder="Add a step…"
          style={{ fontSize: 12, padding: 8, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.color.border }}
        />
      )}
    </View>
  );
}

/**
 * Rollup of everything tied to this pod, in two kinds: general prep TASKS
 * (toggleable by any pod member) and scheduled SHIFTS (toggleable only by
 * that shift's assignee, each with its own optional internal checklist of
 * steps), plus a read-only view of games on the pod's fields. Task/shift
 * creation stays web-only, matching the rest of this app's admin tooling.
 */
export function PodTaskList({ podId }: { podId: string }) {
  const { profile } = useAuth();
  const { data: myPods } = useMyPods(profile?.uid);
  const { data: games } = useGamesByPod(podId);
  const { data: shifts } = useVolunteerTasksByPod(podId);
  const { data: tasks } = usePodTasksByPod(podId);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = myPods.some((p) => p.id === podId);
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

  const openTask = sortedTasks.find((t) => t.id === openTaskId) ?? null;
  const openShift = sortedShifts.find((t) => t.id === openShiftId) ?? null;

  if (sortedGames.length === 0 && sortedShifts.length === 0 && sortedTasks.length === 0) {
    return <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Nothing tagged to this pod yet.</Text>;
  }

  return (
    <View style={{ gap: 20 }}>
      {sortedTasks.length > 0 && (
        <View>
          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>TASKS</Text>
          <View style={{ gap: 8 }}>
            {sortedTasks.map((t) => {
              const canToggle = isStaff || isPodMember;
              const isOverdue = !t.done && !!t.dueDate && t.dueDate < todayStr;
              const details = [t.dueDate ? formatDueDate(t.dueDate, todayStr) : null, t.assigneeName].filter(Boolean).join(" · ");
              const commentCount = t.messages?.length ?? 0;
              return (
                <Card key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Checkbox checked={t.done} disabled={!canToggle} onPress={() => toggleTaskDone(t.id, t.done)} />
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
          </View>
        </View>
      )}

      {sortedShifts.length > 0 && (
        <View>
          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>SHIFTS</Text>
          <View style={{ gap: 8 }}>
            {sortedShifts.map((t) => {
              const canToggle = isStaff || t.assigneeUid === profile?.uid;
              const commentCount = t.messages?.length ?? 0;
              return (
                <Card key={t.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Checkbox checked={t.done} disabled={!canToggle} onPress={() => toggleShiftDone(t.id, t.done)} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", fontSize: 13.5, textDecorationLine: t.done ? "line-through" : "none", color: t.done ? theme.color.textMuted : theme.color.text }}>
                        {t.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                        {t.time} · {t.location} {t.assigneeName ? `· ${t.assigneeName}` : "· Unassigned"}
                      </Text>
                    </View>
                    {t.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
                    <TouchableOpacity onPress={() => setOpenShiftId(t.id)} style={{ padding: 6 }}>
                      <Text style={{ color: theme.color.textMuted, fontSize: 12.5, fontWeight: "700" }}>
                        💬 {commentCount > 0 ? commentCount : "Comment"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <ShiftSteps shift={t} canManage={canToggle} />
                </Card>
              );
            })}
          </View>
        </View>
      )}

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

      {openTask && <PodTaskDetailModal task={openTask} canPost={isStaff || isPodMember} onClose={() => setOpenTaskId(null)} />}
      {openShift && <VolunteerTaskDetailModal task={openShift} onClose={() => setOpenShiftId(null)} />}
    </View>
  );
}
