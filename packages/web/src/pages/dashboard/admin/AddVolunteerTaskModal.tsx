import { useEffect, useMemo, useState } from "react";
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
import { usePod, usePods, useVolunteers } from "../../../hooks/useData";
import { getPodMemberNames } from "../../../lib/callables";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";

interface Assignee {
  uid: string;
  displayName: string;
}

/**
 * Opened either from the general Volunteers tab (no pod context — assignee
 * pool is everyone with the "volunteer" role) or from a Pod's Tasks view
 * (`initialPodId` set, pod locked — assignee pool is that pod's own roster,
 * since most pod members won't hold the volunteer role at all). Anyone on
 * the pod, not just staff, can open this from a Pod's Tasks view.
 */
export function AddVolunteerTaskModal({ onClose, initialPodId }: { onClose: () => void; initialPodId?: string }) {
  const { user } = useAuth();
  const { data: volunteers } = useVolunteers();
  const { data: pods } = usePods();
  const { data: lockedPod } = usePod(initialPodId);
  const [podMembers, setPodMembers] = useState<Assignee[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<VolunteerTaskType | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [podId, setPodId] = useState<string | null>(initialPodId ?? null);
  const [assigneeUid, setAssigneeUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initialPodId) return;
    getPodMemberNames({ podId: initialPodId })
      .then((res) => setPodMembers(res.data.members))
      .catch((e) => console.error("getPodMemberNames failed:", e));
  }, [initialPodId]);

  const assigneeChoices: Assignee[] = useMemo(() => {
    if (!initialPodId) return volunteers.map((v) => ({ uid: v.uid, displayName: v.displayName }));
    return podMembers;
  }, [initialPodId, volunteers, podMembers]);

  async function submit() {
    if (!user || !title.trim() || !type || !time || !location) return;
    setBusy(true);
    try {
      const assignee = assigneeChoices.find((v) => v.uid === assigneeUid);
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

      {!initialPodId && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Pod (optional)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <Pill active={!podId} onClick={() => setPodId(null)}>None</Pill>
            {pods.map((p) => <Pill key={p.id} active={podId === p.id} onClick={() => setPodId(p.id)}>{p.name}</Pill>)}
          </div>
        </>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        Assign to (optional){initialPodId && lockedPod && ` — ${lockedPod.name} members`}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <Pill active={!assigneeUid} onClick={() => setAssigneeUid(null)}>Unassigned</Pill>
        {assigneeChoices.map((v) => <Pill key={v.uid} active={assigneeUid === v.uid} onClick={() => setAssigneeUid(v.uid)}>{v.displayName}</Pill>)}
        {initialPodId && assigneeChoices.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No members on this pod yet.</div>
        )}
      </div>

      <PrimaryButton disabled={busy || !title.trim() || !type || !time || !location} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Creating…" : "CREATE SHIFT"}
      </PrimaryButton>
    </Modal>
  );
}
