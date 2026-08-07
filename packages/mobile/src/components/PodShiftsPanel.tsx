import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, compareTaskTimes, type VolunteerTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useGamesByPod, useVolunteerTasksByPod } from "../hooks/useData";
import { VolunteerTaskDetailModal } from "./VolunteerTaskDetailModal";
import { Card, Pill, StatusBadge } from "./ui";

/** A shift's own internal checklist — separate from the pod-wide Tasks tab, scoped to just this one shift. */
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
        <TouchableOpacity key={s.id} disabled={!canManage} onPress={() => toggleStep(s.id)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 17, height: 17, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center",
              borderColor: s.done ? theme.color.navy : theme.color.border, backgroundColor: s.done ? theme.color.navy : "transparent",
            }}
          >
            {s.done && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 12.5, textDecorationLine: s.done ? "line-through" : "none", color: s.done ? theme.color.textMuted : theme.color.text }}>
            {s.title}
          </Text>
        </TouchableOpacity>
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

/** Scheduled shifts (time/location/assignee, each with its own optional checklist) plus a read-only view of games on the pod's fields. Shift creation stays web-only, matching the rest of this app's admin tooling. */
export function PodShiftsPanel({ podId }: { podId: string }) {
  const { profile } = useAuth();
  const { data: games } = useGamesByPod(podId);
  const { data: shifts } = useVolunteerTasksByPod(podId);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const sortedGames = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const sortedShifts = [...shifts].sort((a, b) => compareTaskTimes(a.time, b.time));
  const openShift = sortedShifts.find((t) => t.id === openShiftId) ?? null;

  if (sortedShifts.length === 0 && sortedGames.length === 0) {
    return <Text style={{ color: theme.color.textMuted, fontSize: 13.5, padding: 14 }}>Nothing scheduled for this pod yet.</Text>;
  }

  return (
    <View style={{ padding: 14, gap: 20 }}>
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
                    <TouchableOpacity
                      disabled={!canToggle}
                      onPress={() => updateDoc(doc(db, COLLECTIONS.volunteerTasks, t.id), { done: !t.done })}
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

      {openShift && <VolunteerTaskDetailModal task={openShift} onClose={() => setOpenShiftId(null)} />}
    </View>
  );
}
