import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, compareTaskTimes, type VolunteerTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useGamesByPod, usePod, useVolunteerTasksByPod } from "../hooks/useData";
import { AddVolunteerTaskModal } from "../pages/dashboard/admin/AddVolunteerTaskModal";
import { VolunteerTaskDetailModal } from "./VolunteerTaskDetailModal";
import { Card, Pill, PrimaryButton, StatusBadge } from "./ui";

async function toggleShiftDone(shiftId: string, done: boolean) {
  await updateDoc(doc(db, COLLECTIONS.volunteerTasks, shiftId), { done: !done });
}

/** A shift's own internal checklist — separate from the pod-wide TASKS list, scoped to just this one shift. Only the assignee or staff can add/toggle steps. */
function ShiftSteps({ shift, canManage }: { shift: VolunteerTask; canManage: boolean }) {
  const [newStep, setNewStep] = useState("");
  const steps = shift.steps ?? [];

  async function addStep() {
    if (!newStep.trim()) return;
    const step = { id: crypto.randomUUID(), title: newStep.trim(), done: false };
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, shift.id), { steps: [...steps, step] });
    setNewStep("");
  }

  async function toggleStep(stepId: string) {
    const updated = steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, shift.id), { steps: updated });
  }

  if (steps.length === 0 && !canManage) return null;

  return (
    <div style={{ marginTop: 10, paddingLeft: 28, display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={s.done}
            disabled={!canManage}
            onChange={() => toggleStep(s.id)}
            style={{ width: 15, height: 15, cursor: canManage ? "pointer" : "default" }}
          />
          <span style={{ fontSize: 12.5, textDecoration: s.done ? "line-through" : "none", color: s.done ? theme.color.textMuted : theme.color.text }}>
            {s.title}
          </span>
        </div>
      ))}
      {canManage && (
        <input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addStep()}
          placeholder="Add a step…"
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}` }}
        />
      )}
    </div>
  );
}

/** Scheduled SHIFTS (time/location/assignee, each with its own optional checklist) plus a read-only view of GAMES on the pod's fields. */
export function PodShiftsTab({ podId }: { podId: string }) {
  const { profile } = useAuth();
  const { data: pod } = usePod(podId);
  const { data: games } = useGamesByPod(podId);
  const { data: shifts } = useVolunteerTasksByPod(podId);
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!profile && !!pod?.memberUids.includes(profile.uid);
  const canAdd = isStaff || isPodMember;
  const sortedGames = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const sortedShifts = [...shifts].sort((a, b) => compareTaskTimes(a.time, b.time));
  const openShift = sortedShifts.find((t) => t.id === openShiftId) ?? null;

  return (
    <div>
      {canAdd && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <PrimaryButton onClick={() => setAddShiftOpen(true)}>+ ADD SHIFT</PrimaryButton>
        </div>
      )}

      {sortedShifts.length === 0 && sortedGames.length === 0 && (
        <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Nothing scheduled for this pod yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {sortedShifts.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>SHIFTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedShifts.map((t) => {
                const canToggle = isStaff || t.assigneeUid === profile?.uid;
                const commentCount = t.messages?.length ?? 0;
                return (
                  <Card key={t.id} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={t.done}
                        disabled={!canToggle}
                        onChange={() => toggleShiftDone(t.id, t.done)}
                        style={{ width: 18, height: 18, cursor: canToggle ? "pointer" : "default" }}
                      />
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, textDecoration: t.done ? "line-through" : "none", color: t.done ? theme.color.textMuted : theme.color.text }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                          {t.time} · {t.location} {t.assigneeName ? `· ${t.assigneeName}` : "· Unassigned"}
                        </div>
                      </div>
                      {t.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
                      <button
                        type="button"
                        onClick={() => setOpenShiftId(t.id)}
                        style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "6px 8px", whiteSpace: "nowrap" }}
                      >
                        💬 {commentCount > 0 ? commentCount : "Comment"}
                      </button>
                    </div>
                    <ShiftSteps shift={t} canManage={canToggle} />
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
                <Card key={g.id} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ minWidth: 120 }}>
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

      {addShiftOpen && <AddVolunteerTaskModal initialPodId={podId} onClose={() => setAddShiftOpen(false)} />}
      {openShift && <VolunteerTaskDetailModal task={openShift} onClose={() => setOpenShiftId(null)} />}
    </div>
  );
}
