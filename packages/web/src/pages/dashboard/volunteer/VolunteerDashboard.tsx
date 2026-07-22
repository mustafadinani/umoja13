import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type VolunteerTask } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useMyVolunteerTasks } from "../../../hooks/useData";
import { fileIncident } from "../../../lib/callables";
import { Card, PrimaryButton, Pill } from "../../../components/ui";

export function VolunteerDashboard() {
  const { user, profile } = useAuth();
  const { data: tasks } = useMyVolunteerTasks(user?.uid);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function markDone(task: VolunteerTask) {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), { done: !task.done });
  }

  async function flagCantMake(task: VolunteerTask) {
    const reason = reasonDrafts[task.id] ?? "";
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), {
      cantMake: !task.cantMake,
      cantMakeReason: !task.cantMake ? reason : "",
    });
  }

  async function sendMessage() {
    if (!profile || message.trim().length < 3) return;
    setSending(true);
    try {
      await fileIncident({ source: "volunteer_message", filedByName: profile.displayName, filedByRole: "volunteer", text: message });
      setMessage("");
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>MY SHIFTS</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {tasks.map((t) => (
          <Card key={t.id} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.title}</div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{t.time} · {t.location}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {t.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
                {t.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <button
                onClick={() => markDone(t)}
                style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                {t.done ? "Mark not done" : "Mark done"}
              </button>
              {!t.cantMake && (
                <input
                  placeholder="Reason (optional)"
                  value={reasonDrafts[t.id] ?? ""}
                  onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5 }}
                />
              )}
              <button
                onClick={() => flagCantMake(t)}
                style={{ background: t.cantMake ? theme.color.dangerBg : "none", color: t.cantMake ? theme.color.danger : theme.color.text, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                {t.cantMake ? "I can make it after all" : "Can't make it"}
              </button>
            </div>
          </Card>
        ))}
        {tasks.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No shifts assigned to you yet — check back soon.</div>}
      </div>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MESSAGE THE ORGANIZERS</div>
      <Card>
        {sent && <div style={{ color: theme.color.success, fontSize: 13, marginBottom: 10 }}>Sent — an organizer will follow up.</div>}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Question about a shift, or anything else…"
          rows={3}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5, resize: "none" }}
        />
        <PrimaryButton disabled={sending || message.trim().length < 3} onClick={sendMessage}>{sending ? "Sending…" : "SEND"}</PrimaryButton>
      </Card>
    </div>
  );
}
