import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type VolunteerTask } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useMyVolunteerTasks } from "../../../hooks/useData";
import { Card, Pill } from "../../../components/ui";
import { RoleChannelPanel } from "../../../components/RoleChannelPanel";

type Tab = "shifts" | "channel";

export function VolunteerDashboard() {
  const { user } = useAuth();
  const { data: tasks } = useMyVolunteerTasks(user?.uid);
  const [tab, setTab] = useState<Tab>("shifts");
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

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

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>VOLUNTEER</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill active={tab === "shifts"} onClick={() => setTab("shifts")}>My Shifts</Pill>
        <Pill active={tab === "channel"} onClick={() => setTab("channel")}>Channel</Pill>
      </div>

      {tab === "channel" ? (
        <RoleChannelPanel role="volunteer" />
      ) : (
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
      )}
    </div>
  );
}
