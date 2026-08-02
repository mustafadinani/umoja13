import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useMyVolunteerTasks } from "../../../hooks/useData";
import { Card, Pill } from "../../../components/ui";
import { VolunteerTaskDetailModal } from "../../../components/VolunteerTaskDetailModal";

export function VolunteerDashboard() {
  const { user } = useAuth();
  const { data: tasks } = useMyVolunteerTasks(user?.uid);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  return (
    <div className="page-shell-sm">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>VOLUNTEER</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {tasks.map((t) => (
          <Card key={t.id} onClick={() => setOpenTaskId(t.id)} style={{ padding: "14px 16px", cursor: "pointer" }}>
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
          </Card>
        ))}
        {tasks.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No shifts assigned to you yet — check back soon.</div>}
      </div>

      {openTask && <VolunteerTaskDetailModal task={openTask} onClose={() => setOpenTaskId(null)} />}
    </div>
  );
}
