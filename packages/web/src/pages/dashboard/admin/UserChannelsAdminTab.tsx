import { useMemo, useState } from "react";
import { orderBy } from "firebase/firestore";
import { COLLECTIONS, type UserChannel, type UserProfile } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useCollection } from "../../../hooks/firestore";
import { useAllUsers } from "../../../hooks/useData";
import { Card } from "../../../components/ui";
import { UserChannelPanel } from "../../../components/UserChannelPanel";

/**
 * A real inbox: conversations on the left, the selected thread (with reply
 * box) on the right — instead of the old top-to-bottom stack where opening a
 * thread pushed it below every other conversation. Mirrors the sidebar+detail
 * pattern already used for Pods.
 */
export function UserChannelsAdminTab() {
  const { data: channels } = useCollection<UserChannel>(COLLECTIONS.userChannels, [orderBy("updatedAt", "desc")]);
  const { data: users } = useAllUsers();
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const [search, setSearch] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const searchResults = search.trim()
    ? users.filter((u) => u.displayName.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  const selected = selectedUid ? userById.get(selectedUid) : undefined;
  const selectedChannel = channels.find((c) => c.id === selectedUid);

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MESSAGES</div>

      <div className="pods-layout">
        <div style={{ position: "sticky", top: 20 }}>
          <Card style={{ marginBottom: 12 }}>
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

          <div style={{ fontWeight: 700, fontSize: 13, margin: "4px 0 8px" }}>Conversations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "62vh", overflowY: "auto", paddingRight: 2 }}>
            {channels.map((c) => (
              <ConversationRow
                key={c.id}
                channel={c}
                profile={userById.get(c.id)}
                active={c.id === selectedUid}
                onSelect={() => setSelectedUid(c.id)}
              />
            ))}
            {channels.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5, padding: "8px 4px" }}>No conversations yet.</div>}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {selectedUid ? (
            <Card>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                {conversationName(selectedChannel, selectedUid, selected)}
                {selected?.email && <span style={{ color: theme.color.textMuted, fontWeight: 400, fontSize: 12.5 }}> · {selected.email}</span>}
              </div>
              <UserChannelPanel uid={selectedUid} />
            </Card>
          ) : (
            <Card style={{ color: theme.color.textMuted, fontSize: 13.5, textAlign: "center", padding: "40px 20px" }}>
              Select a conversation on the left, or search for a user above to start a new one.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The `users/{uid}` profile doc is missing for anyone who registered through
 * Outreach but never went through the app's own sign-up flow — falling back
 * straight to the raw doc id there used to surface things like "_wy5wdabb8"
 * in the inbox. Every message already carries a properly resolved
 * `authorName` (Outreach profile -> Auth displayName -> email), so prefer the
 * most recent one of those before ever showing the bare id.
 */
function conversationName(channel: UserChannel | undefined, uid: string, profile?: UserProfile): string {
  if (profile?.displayName?.trim()) return profile.displayName.trim();
  const lastUserMessage = [...(channel?.messages ?? [])].reverse().find((m) => m.from === "user");
  if (lastUserMessage?.authorName?.trim() && lastUserMessage.authorName !== "Someone") return lastUserMessage.authorName.trim();
  return uid;
}

function ConversationRow({
  channel,
  profile,
  active,
  onSelect,
}: {
  channel: UserChannel;
  profile?: UserProfile;
  active: boolean;
  onSelect: () => void;
}) {
  const sorted = [...channel.messages].sort((a, b) => a.createdAt - b.createdAt);
  const last = sorted[sorted.length - 1];
  // A real "awaiting a human" signal: the AI answers every non-escalated
  // message immediately, so the thread only ends on a bare user turn when
  // either they've asked to talk to an organizer, or the bot failed to
  // reply — both cases actually need staff attention. A long AI
  // back-and-forth (thread ending on an "ai" turn) never counts.
  const awaitingOrganizer = last?.from === "user";

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "10px 12px",
        borderRadius: theme.radius.sm,
        border: `1px solid ${active ? theme.color.purple : theme.color.border}`,
        background: active ? "#F1EFF5" : "#fff",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conversationName(channel, channel.id, profile)}
          </div>
          {awaitingOrganizer && (
            <span style={{ fontSize: 10, fontWeight: 800, color: theme.color.pink, background: "#FBE3EA", borderRadius: 999, padding: "2px 7px", flexShrink: 0 }}>
              WAITING
            </span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: theme.color.textMuted, flexShrink: 0 }}>{new Date(channel.updatedAt).toLocaleDateString()}</div>
      </div>
      {last && (
        <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {last.from === "ai" ? `🤖 ${last.text}` : last.text}
        </div>
      )}
    </div>
  );
}
