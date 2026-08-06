import { type Pod } from "@umoja/shared";
import { theme } from "../lib/theme";
import { usePodMemberSearch, podRoleLabel } from "../hooks/usePodMemberSearch";
import { updatePod } from "../lib/callables";
import { Pill } from "./ui";

/**
 * Quick add/remove for a pod's roster, right on the pod's own detail view —
 * the fuller PodEditorModal ("Edit") still exists for renaming a pod or
 * changing its fields, but adding a person shouldn't require opening that.
 * Every change here commits immediately (no separate Save step).
 *
 * Each name is tagged with its actual role (Admin/Referee/Volunteer/…) —
 * a pod "member" is anyone slotted into this staffing zone, which is not
 * the same thing as a "volunteer" (a specific role); most pods mix both.
 */
export function PodMembersEditor({ pod }: { pod: Pod }) {
  const { search, setSearch, nameResults, emailLookup, runEmailLookup, looksLikeEmail, nameByUid, roleByUid, resetSearch } =
    usePodMemberSearch(pod.memberUids);

  async function addMember(uid: string) {
    await updatePod({ podId: pod.id, memberUids: [...pod.memberUids, uid] });
    resetSearch();
  }

  async function removeMember(uid: string) {
    await updatePod({ podId: pod.id, memberUids: pod.memberUids.filter((u) => u !== uid) });
  }

  const emailAlreadyAMember = emailLookup.result ? pod.memberUids.includes(emailLookup.result.uid) : false;

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        MEMBERS <span style={{ color: theme.color.textMuted, fontWeight: 600 }}>({pod.memberUids.length})</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {pod.memberUids.map((uid) => (
          <Pill key={uid} onClick={() => removeMember(uid)}>
            {nameByUid.get(uid) ?? uid} <span style={{ opacity: 0.65 }}>· {podRoleLabel(roleByUid.get(uid))}</span> ✕
          </Pill>
        ))}
        {pod.memberUids.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No members yet.</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && looksLikeEmail && runEmailLookup()}
          placeholder="+ Add a member — search by name, or paste an email…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        {looksLikeEmail && (
          <button
            onClick={runEmailLookup}
            disabled={emailLookup.status === "loading"}
            style={{ padding: "0 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, fontWeight: 700, background: "none", cursor: "pointer" }}
          >
            {emailLookup.status === "loading" ? "Looking up…" : "Look up"}
          </button>
        )}
      </div>

      {nameResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {nameResults.map((c) => (
            <div
              key={c.uid}
              onClick={() => addMember(c.uid)}
              style={{ padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
            >
              {c.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {podRoleLabel(roleByUid.get(c.uid))}</span>
            </div>
          ))}
        </div>
      )}

      {emailLookup.status === "done" && (
        <div>
          {emailLookup.result ? (
            <div
              onClick={() => !emailAlreadyAMember && addMember(emailLookup.result!.uid)}
              style={{
                padding: "8px 10px",
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.color.border}`,
                cursor: emailAlreadyAMember ? "default" : "pointer",
                fontSize: 13.5,
                opacity: emailAlreadyAMember ? 0.6 : 1,
              }}
            >
              {emailLookup.result.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {emailLookup.result.sublabel}</span>
              {emailAlreadyAMember && <span style={{ color: theme.color.textMuted, fontSize: 12 }}> · already added</span>}
            </div>
          ) : (
            <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No account found for that email.</div>
          )}
        </div>
      )}
    </div>
  );
}
