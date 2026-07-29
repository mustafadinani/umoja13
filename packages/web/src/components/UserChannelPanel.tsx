import { useState } from "react";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useUserChannel } from "../hooks/useData";
import { sendUserMessage } from "../lib/callables";
import { PrimaryButton } from "./ui";

/** One-way "message the organizers" channel for a single user — used on that user's own profile and from the admin Messages tab. */
export function UserChannelPanel({ uid }: { uid: string }) {
  const { profile } = useAuth();
  const { data: channel } = useUserChannel(uid);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isOwner = profile?.uid === uid;
  const canPost = isStaff || isOwner;
  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendUserMessage({ targetUid: uid, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 14 }}>
        {isOwner
          ? "Message the organizers directly — an admin or the commissioner will reply here."
          : "One-way channel between this user and the organizers."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.from === "admin" ? "flex-start" : "flex-end",
              background: m.from === "admin" ? theme.color.navy : "#F1EFF5",
              color: m.from === "admin" ? "#fff" : theme.color.text,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13.5,
              maxWidth: "75%",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 2 }}>
              {m.from === "admin" ? "Organizers" : m.authorName}
            </div>
            {m.text}
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
            {canPost ? "No messages yet — send the first one below." : "No messages yet."}
          </div>
        )}
      </div>

      {canPost ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={isOwner ? "Message the organizers…" : "Reply…"}
            style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
          />
          <PrimaryButton disabled={sending || !draft.trim()} onClick={send}>Send</PrimaryButton>
        </div>
      ) : (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only this user and organizers can post here.</div>
      )}
    </div>
  );
}
