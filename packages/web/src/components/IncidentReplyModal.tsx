import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { COLLECTIONS, type Incident, type IncidentStatus, type IncidentMessage } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Modal, Pill, PrimaryButton } from "./ui";

const STATUSES: IncidentStatus[] = ["submitted", "under_review", "resolved", "denied"];

export function IncidentReplyModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function setStatus(status: IncidentStatus) {
    await updateDoc(doc(db, COLLECTIONS.incidents, incident.id), { status, updatedAt: Date.now() });
  }

  async function send() {
    if (!draft.trim() || !user) return;
    setBusy(true);
    const message: IncidentMessage = {
      id: `${Date.now()}`,
      from: "commissioner",
      authorUid: user.uid,
      text: draft,
      createdAt: Date.now(),
    };
    await updateDoc(doc(db, COLLECTIONS.incidents, incident.id), {
      thread: arrayUnion(message),
      updatedAt: Date.now(),
    });
    setDraft("");
    setBusy(false);
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        Case #{incident.caseNumber}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 12 }}>
        {incident.source.replace("_", " ")} · {incident.filedByName} ({incident.filedByRole})
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {STATUSES.map((s) => (
          <Pill key={s} active={incident.status === s} onClick={() => setStatus(s)}>{s.replace("_", " ")}</Pill>
        ))}
      </div>

      <div style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12, fontSize: 13.5, marginBottom: 14 }}>
        {incident.text}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
        {incident.thread.map((m) => (
          <div key={m.id} style={{ alignSelf: m.from === "commissioner" ? "flex-end" : "flex-start", background: m.from === "commissioner" ? theme.color.purple : "#F1EFF5", color: m.from === "commissioner" ? "#fff" : theme.color.text, borderRadius: 10, padding: "8px 12px", fontSize: 13, maxWidth: "85%" }}>
            {m.text}
          </div>
        ))}
        {incident.thread.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No messages yet.</div>}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Send a message…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        <PrimaryButton disabled={busy || !draft.trim()} onClick={send}>Send</PrimaryButton>
      </div>
    </Modal>
  );
}
