import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import {
  COLLECTIONS,
  VOLUNTEER_TASK_TYPES,
  VOLUNTEER_TASK_TIMES,
  VOLUNTEER_TASK_LOCATIONS,
  type VolunteerTaskType,
} from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { usePods, useVolunteers } from "../../../hooks/useData";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";

export function AddVolunteerTaskModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { data: volunteers } = useVolunteers();
  const { data: pods } = usePods();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<VolunteerTaskType | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [podId, setPodId] = useState<string | null>(null);
  const [assigneeUid, setAssigneeUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user || !title.trim() || !type || !time || !location) return;
    setBusy(true);
    try {
      const assignee = volunteers.find((v) => v.uid === assigneeUid);
      await addDoc(collection(db, COLLECTIONS.volunteerTasks), {
        title,
        type,
        time,
        location,
        podId: podId ?? null,
        assigneeUid: assignee?.uid ?? null,
        assigneeName: assignee?.displayName ?? null,
        done: false,
        cantMake: false,
        createdAt: Date.now(),
        createdBy: user.uid,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Add a shift</div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Title</div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Water table — Field 1"
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 14, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Type</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {VOLUNTEER_TASK_TYPES.map((t) => (
          <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.label}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Time</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {VOLUNTEER_TASK_TIMES.map((t) => (
          <Pill key={t} active={time === t} onClick={() => setTime(t)}>{t}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Location</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {VOLUNTEER_TASK_LOCATIONS.map((l) => (
          <Pill key={l} active={location === l} onClick={() => setLocation(l)}>{l}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Pod (optional)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill active={!podId} onClick={() => setPodId(null)}>None</Pill>
        {pods.map((p) => <Pill key={p.id} active={podId === p.id} onClick={() => setPodId(p.id)}>{p.name}</Pill>)}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Assign to (optional)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <Pill active={!assigneeUid} onClick={() => setAssigneeUid(null)}>Unassigned</Pill>
        {volunteers.map((v) => <Pill key={v.uid} active={assigneeUid === v.uid} onClick={() => setAssigneeUid(v.uid)}>{v.displayName}</Pill>)}
      </div>

      <PrimaryButton disabled={busy || !title.trim() || !type || !time || !location} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Creating…" : "CREATE SHIFT"}
      </PrimaryButton>
    </Modal>
  );
}
