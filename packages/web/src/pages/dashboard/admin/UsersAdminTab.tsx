import { useState } from "react";
import { type Role } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllUsers, usePods } from "../../../hooks/useData";
import { Card } from "../../../components/ui";
import { ROLE_LABELS } from "../../../lib/roleLabels";
import { UserRoleModal } from "./UserRoleModal";

/** Admin-only directory of umoja13-app users — assign roles and pod membership from one place. Only lists accounts that have signed into the tournament app (a `users` doc); pure Outreach/registration-only people don't appear here. */
export function UsersAdminTab() {
  const { data: users } = useAllUsers();
  const { data: pods } = usePods();
  const [search, setSearch] = useState("");
  const [openUid, setOpenUid] = useState<string | null>(null);

  const term = search.trim().toLowerCase();
  const visible = users
    .filter((u) => u.displayName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const openUser = users.find((u) => u.uid === openUid) ?? null;

  function podsFor(uid: string) {
    return pods.filter((p) => p.memberUids.includes(uid));
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        style={{ width: "100%", maxWidth: 360, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16, fontSize: 13.5 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((u) => {
          const userPods = podsFor(u.uid);
          return (
            <Card key={u.uid} onClick={() => setOpenUid(u.uid)} style={{ padding: "12px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName}</div>
                  <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{u.email}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 280 }}>
                  {u.roles.map((r: Role) => (
                    <span
                      key={r}
                      style={{
                        background: r === u.primaryRole ? theme.color.navy : "#F1EFF5",
                        color: r === u.primaryRole ? "#fff" : theme.color.text,
                        borderRadius: 999,
                        padding: "3px 9px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {ROLE_LABELS[r]}
                    </span>
                  ))}
                </div>
              </div>
              {userPods.length > 0 && (
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 6 }}>
                  Pods: {userPods.map((p) => p.name).join(", ")}
                </div>
              )}
            </Card>
          );
        })}
        {visible.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No users match "{search}".</div>}
      </div>

      {openUser && <UserRoleModal user={openUser} pods={pods} onClose={() => setOpenUid(null)} />}
    </div>
  );
}
