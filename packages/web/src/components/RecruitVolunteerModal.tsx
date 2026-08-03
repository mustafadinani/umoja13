import { useEffect, useState } from "react";
import { theme } from "../lib/theme";
import { addPodVolunteer, getRecruitableVolunteers } from "../lib/callables";
import { Modal, PrimaryButton } from "./ui";

interface Candidate {
  uid: string;
  displayName: string;
}

/** Lets a pod's own volunteer members (not just staff) pull other registered volunteers onto the pod's roster. */
export function RecruitVolunteerModal({ podId, podName, onClose }: { podId: string; podName?: string; onClose: () => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecruitableVolunteers({ podId })
      .then((res) => setCandidates(res.data.candidates))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load volunteers."))
      .finally(() => setLoading(false));
  }, [podId]);

  const visible = candidates.filter(
    (c) => !added.has(c.uid) && c.displayName.toLowerCase().includes(search.trim().toLowerCase())
  );

  async function recruit(candidate: Candidate) {
    setBusyUid(candidate.uid);
    setError(null);
    try {
      await addPodVolunteer({ podId, uidToAdd: candidate.uid });
      setAdded((prev) => new Set(prev).add(candidate.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this volunteer.");
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <Modal onClose={onClose} width={420}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        Recruit a volunteer{podName && <span style={{ color: theme.color.textMuted }}> — {podName}</span>}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        Add any registered volunteer who isn't already on this pod.
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search volunteers…"
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      {error && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: theme.color.textMuted, fontSize: 13, padding: "12px 0" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {visible.map((c) => (
            <div key={c.uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.displayName}</span>
              <PrimaryButton disabled={busyUid === c.uid} onClick={() => recruit(c)} style={{ padding: "6px 14px", fontSize: 12.5 }}>
                {busyUid === c.uid ? "Adding…" : "ADD"}
              </PrimaryButton>
            </div>
          ))}
          {visible.length === 0 && (
            <div style={{ color: theme.color.textMuted, fontSize: 13 }}>
              {search ? `No volunteers match "${search}".` : "No other volunteers to recruit right now."}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
