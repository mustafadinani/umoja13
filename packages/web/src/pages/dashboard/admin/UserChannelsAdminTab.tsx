import { useMemo, useState } from "react";
import { orderBy } from "firebase/firestore";
import { COLLECTIONS, type UserChannel } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useCollection } from "../../../hooks/firestore";
import { useAllUsers } from "../../../hooks/useData";
import { Card } from "../../../components/ui";
import { UserChannelPanel } from "../../../components/UserChannelPanel";

export function UserChannelsAdminTab() {
  const { data: channels } = useCollection<UserChannel>(COLLECTIONS.userChannels, [orderBy("updatedAt", "desc")]);
  const { data: users } = useAllUsers();
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const [search, setSearch] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const searchResults = search.trim()
    ? users.filter((u) => u.displayName.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MESSAGES</div>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Find a user</div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: searchResults.length > 0 ? 10 : 0 }}
        />
        {searchResults.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {searchResults.map((u) => (
              <div
                key={u.uid}
                onClick={() => { setSelectedUid(u.uid); setSearch(""); }}
                style={{ padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
              >
                {u.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {u.email}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Conversations</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {channels.map((c) => {
          const u = userById.get(c.id);
          const last = c.messages[c.messages.length - 1];
          return (
            <Card
              key={c.id}
              onClick={() => setSelectedUid(c.id)}
              style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u?.displayName ?? c.id}</div>
                {last && <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{last.text}</div>}
              </div>
              <div style={{ fontSize: 11, color: theme.color.textMuted }}>{new Date(c.updatedAt).toLocaleDateString()}</div>
            </Card>
          );
        })}
        {channels.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No conversations yet.</div>}
      </div>

      {selectedUid && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{userById.get(selectedUid)?.displayName ?? selectedUid}</div>
          <UserChannelPanel uid={selectedUid} />
        </Card>
      )}
    </div>
  );
}
