import { useState } from "react";
import type { VolunteerApplication } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { colorForSeed } from "../../../lib/podColors";
import { useVolunteers, useVolunteerApplications, useVolunteerTasks } from "../../../hooks/useData";
import { Avatar, Card, Pill, PrimaryButton } from "../../../components/ui";
import { VolunteerApplicationModal } from "./VolunteerApplicationModal";
import { AddVolunteerTaskModal } from "./AddVolunteerTaskModal";

export function VolunteersTab() {
  const { data: volunteers } = useVolunteers();
  const { data: applications } = useVolunteerApplications();
  const { data: tasks } = useVolunteerTasks();
  const [openApplication, setOpenApplication] = useState<VolunteerApplication | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [showAllVolunteers, setShowAllVolunteers] = useState(false);

  const pending = applications.filter((a) => a.status === "pending");
  const attention = tasks.filter((t) => t.cantMake);
  const sortedTasks = [...tasks].sort((a, b) => a.time.localeCompare(b.time));
  const sortedVolunteers = [...volunteers].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const visibleVolunteers = showAllVolunteers ? sortedVolunteers : sortedVolunteers.slice(0, 8);

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
              <Card key={a.id} onClick={() => setOpenApplication(a)} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 120 }}>
                  <Avatar name={a.name} color={colorForSeed(a.filedByUid)} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{a.email} · available {a.availability.join(", ")}</div>
                  </div>
                </div>
                <Pill bg={theme.color.warningBg} fg={theme.color.warning}>Waiting on you</Pill>
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
              <Card key={t.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={t.assigneeName ?? "?"} color={colorForSeed(t.assigneeUid ?? t.assigneeName ?? t.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {t.assigneeName ?? "Unassigned"} · {t.time} · {t.location}
                  </div>
                  {t.cantMakeReason && <div style={{ fontSize: 12.5, color: theme.color.danger, marginTop: 4 }}>"{t.cantMakeReason}"</div>}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>OUR VOLUNTEERS</div>
        {sortedVolunteers.length > 8 && (
          <button
            onClick={() => setShowAllVolunteers((v) => !v)}
            style={{ background: "none", border: "none", color: theme.color.purple, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}
          >
            {showAllVolunteers ? "Show less" : `Show all ${sortedVolunteers.length}`}
          </button>
        )}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 12 }}>Everyone who's said yes so far — thank them by name.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
        {visibleVolunteers.map((v) => (
          <div key={v.uid} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: 999, padding: "6px 14px 6px 6px" }}>
            <Avatar name={v.displayName} size={26} color={colorForSeed(v.uid)} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{v.displayName}</span>
          </div>
        ))}
        {sortedVolunteers.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No one's signed up yet.</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>ALL SHIFTS</div>
        <PrimaryButton onClick={() => setAddTaskOpen(true)}>+ ADD SHIFT</PrimaryButton>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sortedTasks.map((t) => (
          <Card key={t.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={t.assigneeName ?? "?"} color={t.assigneeUid ? colorForSeed(t.assigneeUid) : theme.color.textMuted} />
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                {t.assigneeName ?? "Unassigned — up for grabs"} · {t.time} · {t.location}
              </div>
            </div>
            {t.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
          </Card>
        ))}
        {sortedTasks.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No shifts scheduled yet — add the first one above.</div>}
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
