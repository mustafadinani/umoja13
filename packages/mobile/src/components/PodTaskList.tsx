import { View, Text, TouchableOpacity } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useGamesByPod, useMyPods, usePodTasksByPod, useVolunteerTasksByPod } from "../hooks/useData";
import { Card, Pill, StatusBadge } from "./ui";

function Checkbox({ checked, disabled, onPress }: { checked: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 22,
        height: 22,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: checked ? theme.color.navy : theme.color.border,
        backgroundColor: checked ? theme.color.navy : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>✓</Text>}
    </TouchableOpacity>
  );
}

/**
 * Rollup of everything tied to this pod, in two kinds: general prep TASKS
 * (toggleable by any pod member) and scheduled SHIFTS (toggleable only by
 * that shift's assignee), plus a read-only view of games on the pod's
 * fields. Task/shift creation stays web-only, matching the rest of this
 * app's admin tooling.
 */
export function PodTaskList({ podId }: { podId: string }) {
  const { profile } = useAuth();
  const { data: myPods } = useMyPods(profile?.uid);
  const { data: games } = useGamesByPod(podId);
  const { data: shifts } = useVolunteerTasksByPod(podId);
  const { data: tasks } = usePodTasksByPod(podId);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = myPods.some((p) => p.id === podId);
  const sortedGames = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const sortedShifts = [...shifts].sort((a, b) => a.time.localeCompare(b.time));
  const sortedTasks = [...tasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));

  async function toggleTaskDone(taskId: string, done: boolean) {
    await updateDoc(doc(db, COLLECTIONS.podTasks, taskId), { done: !done });
  }

  async function toggleShiftDone(shiftId: string, done: boolean) {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, shiftId), { done: !done });
  }

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
              return (
                <Card key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Checkbox checked={t.done} disabled={!canToggle} onPress={() => toggleTaskDone(t.id, t.done)} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", fontSize: 13.5, textDecorationLine: t.done ? "line-through" : "none", color: t.done ? theme.color.textMuted : theme.color.text }}>
                      {t.title}
                    </Text>
                    {t.assigneeName && <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{t.assigneeName}</Text>}
                  </View>
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
              return (
                <Card key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
    </View>
  );
}
