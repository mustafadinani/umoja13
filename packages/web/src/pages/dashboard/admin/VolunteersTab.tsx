import { useState } from "react";
import type { VolunteerApplication } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useVolunteers, useVolunteerApplications, useVolunteerTasks } from "../../../hooks/useData";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { VolunteerApplicationModal } from "./VolunteerApplicationModal";
import { AddVolunteerTaskModal } from "./AddVolunteerTaskModal";

export function VolunteersTab() {
  const { data: volunteers } = useVolunteers();
  const { data: applications } = useVolunteerApplications();
  const { data: tasks } = useVolunteerTasks();
  const [openApplication, setOpenApplication] = useState<VolunteerApplication | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const pending = applications.filter((a) => a.status === "pending");
  const attention = tasks.filter((t) => t.cantMake);

  return (
    <div>
      <div className="grid-kpi-4" style={{ marginBottom: 24 }}>
        <Kpi label="Volunteers" value={String(volunteers.length)} />
        <Kpi label="Pending applications" value={String(pending.length)} />
        <Kpi label="Shifts scheduled" value={String(tasks.length)} />
        <Kpi label="Needs attention" value={String(attention.length)} />
      </div>

      {pending.length > 0 && (
        <>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>APPLICATIONS TO REVIEW</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {pending.map((a) => (
              <Card key={a.id} onClick={() => setOpenApplication(a)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{a.email} · available {a.availability.join(", ")}</div>
                </div>
                <Pill bg={theme.color.warningBg} fg={theme.color.warning}>Pending</Pill>
              </Card>
            ))}
          </div>
        </>
      )}

      {attention.length > 0 && (
        <>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>NEEDS ATTENTION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {attention.map((t) => (
              <Card key={t.id} style={{ padding: "12px 16px" }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {t.assigneeName ?? "Unassigned"} · {t.time} · {t.location}
                </div>
                {t.cantMakeReason && <div style={{ fontSize: 12.5, color: theme.color.danger, marginTop: 4 }}>"{t.cantMakeReason}"</div>}
              </Card>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>ALL SHIFTS</div>
        <PrimaryButton onClick={() => setAddTaskOpen(true)}>+ ADD SHIFT</PrimaryButton>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tasks.map((t) => (
          <Card key={t.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                {t.assigneeName ?? "Unassigned"} · {t.time} · {t.location}
              </div>
            </div>
            {t.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
          </Card>
        ))}
        {tasks.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No shifts scheduled yet.</div>}
      </div>

      {openApplication && <VolunteerApplicationModal application={openApplication} onClose={() => setOpenApplication(null)} />}
      {addTaskOpen && <AddVolunteerTaskModal onClose={() => setAddTaskOpen(false)} />}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ textAlign: "center", padding: 16 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 26 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 2 }}>{label}</div>
    </Card>
  );
}
