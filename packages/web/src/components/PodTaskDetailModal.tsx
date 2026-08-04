import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type PodTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { usePod } from "../hooks/useData";
import { sendPodTaskMessage } from "../lib/callables";
import { Modal, Pill, PrimaryButton } from "./ui";

function formatDueDate(dueDate: string): string {
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Full pod-task detail — a done toggle plus a discussion thread scoped to this one task, open to any pod member (unlike a shift's assignee-only Q&A). */
export function PodTaskDetailModal({ task, onClose }: { task: PodTask; onClose: () => void }) {
  const { profile } = useAuth();
  const { data: pod } = usePod(task.podId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!profile && !!pod?.memberUids.includes(profile.uid);
  const canPost = isStaff || isPodMember;
  const messages = [...(task.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function toggleDone() {
    await updateDoc(doc(db, COLLECTIONS.podTasks, task.id), { done: !task.done });
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendPodTaskMessage({ taskId: task.id, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{task.title}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14 }}>
        {[task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : null, task.assigneeName].filter(Boolean).join(" · ") || "No due date"}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {task.done ? (
          <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>
        ) : (
          <Pill bg="#F1EFF5" fg={theme.color.textMuted}>Not done</Pill>
        )}
      </div>

      {canPost && (
        <button
          onClick={toggleDone}
          style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 20 }}
        >
          {task.done ? "Mark not done" : "Mark done"}
        </button>
      )}

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>COMMENTS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.authorUid === profile?.uid ? "flex-end" : "flex-start",
              background: m.authorUid === profile?.uid ? theme.color.navy : "#F1EFF5",
              color: m.authorUid === profile?.uid ? "#fff" : theme.color.text,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13.5,
              maxWidth: "85%",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 2 }}>{m.authorName}</div>
            {m.text}
          </div>
        ))}
        {messages.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No comments yet.</div>}
      </div>

      {canPost ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Add a comment…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
          />
          <PrimaryButton disabled={sending || !draft.trim()} onClick={send}>Send</PrimaryButton>
        </div>
      ) : (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only this pod's members and organizers can post here.</div>
      )}
    </Modal>
  );
}
