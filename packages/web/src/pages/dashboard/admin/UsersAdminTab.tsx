import { useState } from "react";
import { type Role } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllUsers, usePods } from "../../../hooks/useData";
import { Card, PrimaryButton } from "../../../components/ui";
import { ROLE_LABELS } from "../../../lib/roleLabels";
import { UserRoleModal } from "./UserRoleModal";
import { AddUserModal, type NewUserCandidate } from "./AddUserModal";

/**
 * Admin-only directory of umoja13-app users — click a row to assign roles
 * and pod membership from one place. Only lists accounts that have signed
 * into the tournament app (a `users` doc). "+ Add user" covers the other
 * common case — a real account (staff, a family manager) with no Outreach
 * registration data — by email lookup; it deliberately can't find a
 * registered player, since granting them a role here would create a sparse
 * `users` doc that outranks (and would blank out) their real Outreach
 * profile the next time they open the app. Registered players get roles the
 * normal way: they sign in once, then show up in this list.
 */
export function UsersAdminTab() {
  const { data: users } = useAllUsers();
  const { data: pods } = usePods();
  const [search, setSearch] = useState("");
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserCandidate | null>(null);

  const term = search.trim().toLowerCase();
  // A handful of older users/{uid} docs (staff accounts granted a role before
  // they'd ever signed in) were created without displayName/email — guard
  // against that here instead of trusting the type, since one bad doc used
  // to throw inside this filter and take down the whole tab for every admin.
  const visible = users
    .filter((u) => (u.displayName ?? "").toLowerCase().includes(term) || (u.email ?? "").toLowerCase().includes(term))
    .sort((a, b) => (a.displayName ?? "").localeCompare(b.displayName ?? ""));
  const openUser = users.find((u) => u.uid === openUid) ?? null;

  function podsFor(uid: string) {
    return pods.filter((p) => p.memberUids.includes(uid));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ flex: 1, minWidth: 220, maxWidth: 360, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        <PrimaryButton onClick={() => setAddUserOpen(true)}>+ ADD USER</PrimaryButton>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((u) => {
          const userPods = podsFor(u.uid);
          return (
            <Card key={u.uid} onClick={() => setOpenUid(u.uid)} style={{ padding: "12px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || "Unnamed user"}</div>
                  <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{u.email || "No email on file"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 280 }}>
                    {/* Same guard as displayName/email above — a doc created by a
                        feature that only writes one field (e.g. web push
                        registration on a brand-new account) has no roles yet. */}
                    {(u.roles ?? []).map((r: Role) => (
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
                  <span style={{ color: theme.color.textMuted, fontSize: 15 }}>›</span>
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

      {addUserOpen && (
        <AddUserModal
          onPick={(candidate) => {
            setAddUserOpen(false);
            setNewUser(candidate);
          }}
          onClose={() => setAddUserOpen(false)}
        />
      )}

      {newUser && (
        <UserRoleModal
          user={{ uid: newUser.uid, displayName: newUser.displayName, email: newUser.email, roles: [], primaryRole: "fan" }}
          pods={pods}
          onClose={() => setNewUser(null)}
        />
      )}
    </div>
  );
}
