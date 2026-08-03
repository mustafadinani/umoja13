import { useEffect, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { getPodMemberNames } from "../lib/callables";
import { Modal, Pill, PrimaryButton } from "./ui";

/** A simple general prep checklist item for a pod — no time/location, just a title and an optional assignee from the pod's own roster. */
export function AddPodTaskModal({ podId, onClose }: { podId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<{ uid: string; displayName: string }[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeUid, setAssigneeUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPodMemberNames({ podId })
      .then((res) => setMembers(res.data.members))
      .catch((e) => console.error("getPodMemberNames failed:", e));
  }, [podId]);

  async function submit() {
    if (!user || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const assignee = members.find((m) => m.uid === assigneeUid);
      await addDoc(collection(db, COLLECTIONS.podTasks), {
        podId,
        title: title.trim(),
        done: false,
        dueDate: dueDate || null,
        assigneeUid: assignee?.uid ?? null,
        assigneeName: assignee?.displayName ?? null,
        createdAt: Date.now(),
        createdBy: user.uid,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} width={420}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Add a task</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>General prep, not a scheduled shift — anyone on this pod can check it off.</div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Title</div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Finalize Rules & Regulations"
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Due date (optional)</div>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Assign to (optional)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <Pill active={!assigneeUid} onClick={() => setAssigneeUid(null)}>Unassigned</Pill>
        {members.map((m) => <Pill key={m.uid} active={assigneeUid === m.uid} onClick={() => setAssigneeUid(m.uid)}>{m.displayName}</Pill>)}
      </div>

      {error && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          {error}
        </div>
      )}
      <PrimaryButton disabled={busy || !title.trim()} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Adding…" : "ADD TASK"}
      </PrimaryButton>
    </Modal>
  );
}
