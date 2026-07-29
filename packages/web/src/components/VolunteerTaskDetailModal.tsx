import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, VOLUNTEER_TASK_TYPES, type VolunteerTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { sendVolunteerTaskMessage } from "../lib/callables";
import { Modal, Pill, PrimaryButton } from "./ui";

/** Full shift detail — status actions plus a Q&A thread scoped to this one task, so staff always know exactly which shift a question is about. */
export function VolunteerTaskDetailModal({ task, onClose }: { task: VolunteerTask; onClose: () => void }) {
  const { profile } = useAuth();
  const [reason, setReason] = useState(task.cantMakeReason ?? "");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isAssignee = profile?.uid === task.assigneeUid;
  const canPost = isStaff || isAssignee;
  const messages = [...(task.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const typeLabel = VOLUNTEER_TASK_TYPES.find((t) => t.id === task.type)?.label ?? task.type;

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
