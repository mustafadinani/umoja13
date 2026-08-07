import { useState } from "react";
import { ROLES, type Pod, type Role, type UserProfile } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { setUserRole, updatePod } from "../../../lib/callables";
import { ROLE_LABELS } from "../../../lib/roleLabels";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";

type RoleSubject = Pick<UserProfile, "uid" | "email" | "displayName" | "roles" | "primaryRole">;

/**
 * Assign roles, pick which one drives their dashboard, and toggle pod
 * membership — all for one user, in one save. `user` only needs to be a
 * stub (roles: [], a placeholder primaryRole) when this is opened from "+ Add
 * user" for someone who doesn't have a `users` doc yet — setUserRole creates
 * it via merge, same as editing an existing one.
 */
export function UserRoleModal({ user, pods, onClose }: { user: RoleSubject; pods: Pod[]; onClose: () => void }) {
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const [primaryRole, setPrimaryRole] = useState<Role>(user.primaryRole);
  const [podIds, setPodIds] = useState<Set<string>>(
    new Set(pods.filter((p) => p.memberUids.includes(user.uid)).map((p) => p.id))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRole(r: Role) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function togglePod(podId: string) {
    setPodIds((prev) => {
      const next = new Set(prev);
      if (next.has(podId)) next.delete(podId);
      else next.add(podId);
      return next;
    });
  }

  async function save() {
    if (roles.length === 0) {
      setError("Select at least one role.");
      return;
    }
    const finalPrimary = roles.includes(primaryRole) ? primaryRole : roles[0];
    setBusy(true);
    setError(null);
    try {
      await setUserRole({ targetUid: user.uid, roles, primaryRole: finalPrimary });

      for (const pod of pods) {
        const wasIn = pod.memberUids.includes(user.uid);
        const isIn = podIds.has(pod.id);
        if (wasIn === isIn) continue;
        const memberUids = isIn ? [...pod.memberUids, user.uid] : pod.memberUids.filter((uid) => uid !== user.uid);
        await updatePod({ podId: pod.id, memberUids });
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{user.displayName}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 20 }}>{user.email || "No email on file"}</div>
      {user.roles.length === 0 && (
        <div style={{ background: theme.color.warningBg, color: theme.color.warning, borderRadius: theme.radius.sm, padding: 10, fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
          This person hasn't opened the tournament app yet — saving here sets up their roles now, so they're already in place when they do.
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Roles</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {ROLES.map((r) => (
          <Pill key={r} active={roles.includes(r)} onClick={() => toggleRole(r)}>{ROLE_LABELS[r]}</Pill>
        ))}
      </div>

      {roles.length > 1 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Primary role (drives their dashboard)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {roles.map((r) => (
              <Pill key={r} active={primaryRole === r} onClick={() => setPrimaryRole(r)}>{ROLE_LABELS[r]}</Pill>
            ))}
          </div>
        </>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Pods</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {pods.map((p) => (
          <Pill key={p.id} active={podIds.has(p.id)} onClick={() => togglePod(p.id)}>{p.name}</Pill>
        ))}
        {pods.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No pods yet.</div>}
      </div>

      {error && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          {error}
        </div>
      )}

      <PrimaryButton disabled={busy} onClick={save} style={{ width: "100%" }}>
        {busy ? "Saving…" : "SAVE"}
      </PrimaryButton>
    </Modal>
  );
}
