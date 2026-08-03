import { useState } from "react";
import { FIELDS, type Pod, type UserProfile } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllUsers } from "../../../hooks/useData";
import { createPod, updatePod } from "../../../lib/callables";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";

const POD_ELIGIBLE_ROLES = ["admin", "commissioner", "referee", "volunteer"] as const;

function isPodEligible(u: UserProfile): boolean {
  return u.roles.some((r) => (POD_ELIGIBLE_ROLES as readonly string[]).includes(r));
}

/** Create or edit a Pod: name, field coverage, and member roster. Editing the General pod's fields/name is allowed, but it can never be deleted (handled by the caller, not here). */
export function PodEditorModal({ pod, onClose }: { pod?: Pod; onClose: () => void }) {
  const { data: users } = useAllUsers();
  const eligible = users.filter(isPodEligible);

  const [name, setName] = useState(pod?.name ?? "");
  const [fields, setFields] = useState<string[]>(pod?.fields ?? []);
  const [memberUids, setMemberUids] = useState<string[]>(pod?.memberUids ?? []);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const searchResults = search.trim()
    ? eligible.filter((u) => !memberUids.includes(u.uid) && u.displayName.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  function toggleField(f: string) {
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function addMember(uid: string) {
    setMemberUids((prev) => [...prev, uid]);
    setSearch("");
  }

  function removeMember(uid: string) {
    setMemberUids((prev) => prev.filter((u) => u !== uid));
  }

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (pod) {
        await updatePod({ podId: pod.id, name, fields, memberUids });
      } else {
        await createPod({ name, fields, memberUids });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 16 }}>
        {pod ? "Edit pod" : "New pod"}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Name</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Fields 4–6"
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Fields covered (optional)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {FIELDS.map((f) => (
          <Pill key={f} active={fields.includes(f)} onClick={() => toggleField(f)}>{f}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Members</div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search admin/commissioner/referee/volunteer…"
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: searchResults.length > 0 ? 8 : 0 }}
      />
      {searchResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {searchResults.map((u) => (
            <div
              key={u.uid}
              onClick={() => addMember(u.uid)}
              style={{ padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
            >
              {u.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {u.primaryRole}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {memberUids.map((uid) => {
          const u = users.find((x) => x.uid === uid);
          return (
            <Pill key={uid} onClick={() => removeMember(uid)}>
              {u?.displayName ?? uid} ✕
            </Pill>
          );
        })}
        {memberUids.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No members yet.</div>}
      </div>

      <PrimaryButton disabled={busy || !name.trim()} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Saving…" : pod ? "SAVE CHANGES" : "CREATE POD"}
      </PrimaryButton>
    </Modal>
  );
}
