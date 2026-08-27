import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, VOLUNTEER_TASK_TYPES, type VolunteerTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { getPodMemberNames, sendVolunteerTaskMessage } from "../lib/callables";
import { useVolunteers } from "../hooks/useData";
import { Modal, Pill, PrimaryButton } from "./ui";

interface Assignee {
  uid: string;
  displayName: string;
}

/** Full shift detail — status actions plus a Q&A thread scoped to this one task, so staff always know exactly which shift a question is about. */
export function VolunteerTaskDetailModal({ task, onClose }: { task: VolunteerTask; onClose: () => void }) {
  const { profile } = useAuth();
  const { data: volunteers } = useVolunteers();
  const [reason, setReason] = useState(task.cantMakeReason ?? "");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignSearch, setReassignSearch] = useState("");
  const [podMembers, setPodMembers] = useState<Assignee[]>([]);
  const [reassigning, setReassigning] = useState(false);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isAssignee = profile?.uid === task.assigneeUid;
  const canPost = isStaff || isAssignee;
  const canManageSteps = isStaff || isAssignee;
  const steps = task.steps ?? [];
  const messages = [...(task.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const typeLabel = VOLUNTEER_TASK_TYPES.find((t) => t.id === task.type)?.label ?? task.type;

  // Same assignee-pool split AddVolunteerTaskModal uses at creation time — a
  // pod-scoped task's replacement assignee should still come from that pod,
  // not the general volunteer list (most pod members won't hold the
  // "volunteer" role at all).
  useEffect(() => {
    if (!task.podId) return;
    getPodMemberNames({ podId: task.podId })
      .then((res) => setPodMembers(res.data.members))
      .catch((e) => console.error("getPodMemberNames failed:", e));
  }, [task.podId]);

  const assigneeChoices: Assignee[] = useMemo(() => {
    if (!task.podId) return volunteers.map((v) => ({ uid: v.uid, displayName: v.displayName }));
    return podMembers;
  }, [task.podId, volunteers, podMembers]);
  const visibleAssigneeChoices = assigneeChoices.filter(
    (v) => v.uid !== task.assigneeUid && v.displayName.toLowerCase().includes(reassignSearch.trim().toLowerCase())
  );

  async function reassign(assignee: Assignee | null) {
    setReassigning(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), {
        assigneeUid: assignee?.uid ?? null,
        assigneeName: assignee?.displayName ?? null,
      });
      setReassignOpen(false);
      setReassignSearch("");
    } finally {
      setReassigning(false);
    }
  }

  async function addStep() {
    if (!newStep.trim()) return;
    const step = { id: crypto.randomUUID(), title: newStep.trim(), done: false };
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), { steps: [...steps, step] });
    setNewStep("");
  }

  async function toggleStep(stepId: string) {
    const updated = steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), { steps: updated });
  }

  async function markDone() {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), { done: !task.done });
  }

  async function flagCantMake() {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), {
      cantMake: !task.cantMake,
      cantMakeReason: !task.cantMake ? reason : "",
    });
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendVolunteerTaskMessage({ taskId: task.id, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{task.title}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14 }}>
        {typeLabel} · {task.time} · {task.location}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {task.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
        {task.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
        {!task.done && !task.cantMake && <Pill bg="#F1EFF5" fg={theme.color.textMuted}>Upcoming</Pill>}
      </div>

      {isStaff && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>ASSIGNED TO</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: reassignOpen ? 10 : 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{task.assigneeName ?? "Unassigned — up for grabs"}</span>
            <button
              onClick={() => setReassignOpen((v) => !v)}
              style={{ background: "none", border: "none", color: theme.color.purple, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
            >
              {reassignOpen ? "Cancel" : "Reassign"}
            </button>
          </div>
          {reassignOpen && (
            <div>
              {assigneeChoices.length > 5 && (
                <input
                  value={reassignSearch}
                  onChange={(e) => setReassignSearch(e.target.value)}
                  placeholder="Search…"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13 }}
                />
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {task.assigneeUid && (
                  <Pill onClick={() => reassign(null)}>Unassign</Pill>
                )}
                {visibleAssigneeChoices.map((v) => (
                  <Pill key={v.uid} onClick={() => reassign(v)}>{reassigning ? "…" : v.displayName}</Pill>
                ))}
                {assigneeChoices.length === 0 && (
                  <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>
                    {task.podId ? "No other members on this pod." : "No other volunteers found."}
                  </div>
                )}
                {reassignSearch && visibleAssigneeChoices.length === 0 && assigneeChoices.length > 0 && (
                  <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No matches for "{reassignSearch}".</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(steps.length > 0 || canManageSteps) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>STEPS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: canManageSteps ? 8 : 0 }}>
            {steps.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={s.done}
                  disabled={!canManageSteps}
                  onChange={() => toggleStep(s.id)}
                  style={{ width: 16, height: 16, cursor: canManageSteps ? "pointer" : "default" }}
                />
                <span style={{ fontSize: 13, textDecoration: s.done ? "line-through" : "none", color: s.done ? theme.color.textMuted : theme.color.text }}>
                  {s.title}
                </span>
              </div>
            ))}
            {steps.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No steps yet.</div>}
          </div>
          {canManageSteps && (
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStep()}
              placeholder="Add a step…"
              style={{ width: "100%", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5 }}
            />
          )}
        </div>
      )}

      {isAssignee && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={markDone}
            style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", width: "100%" }}
          >
            {task.done ? "Mark not done" : "Mark done"}
          </button>

          {!task.cantMake && (
            <input
              placeholder="Reason for not making it (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, marginTop: 8 }}
            />
          )}
          <button
            onClick={flagCantMake}
            style={{
              background: task.cantMake ? theme.color.dangerBg : "none",
              color: task.cantMake ? theme.color.danger : theme.color.text,
              border: `1px solid ${theme.color.border}`,
              borderRadius: theme.radius.sm,
              padding: "8px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
              marginTop: 8,
            }}
          >
            {task.cantMake ? "I can make it after all" : "Can't make it"}
          </button>
        </div>
      )}

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>QUESTIONS ABOUT THIS SHIFT</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.from === "admin" ? "flex-start" : "flex-end",
              background: m.from === "admin" ? theme.color.navy : "#F1EFF5",
              color: m.from === "admin" ? "#fff" : theme.color.text,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13.5,
              maxWidth: "85%",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 2 }}>
              {m.from === "admin" ? "Organizers" : m.authorName}
            </div>
            {m.text}
          </div>
        ))}
        {messages.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No questions yet.</div>}
      </div>

      {canPost ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask a question about this shift…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
          />
          <PrimaryButton disabled={sending || !draft.trim()} onClick={send}>Send</PrimaryButton>
        </div>
      ) : (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only this shift's volunteer and organizers can post here.</div>
      )}
    </Modal>
  );
}
