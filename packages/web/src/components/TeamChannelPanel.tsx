import { useState } from "react";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useTeam, useTeamChannel } from "../hooks/useData";
import { sendTeamMessage } from "../lib/callables";
import { PrimaryButton } from "./ui";

/** One-way team channel: staff broadcast + roster reply-back. Used on the public Team page and the admin Team Channels tab. */
export function TeamChannelPanel({ teamId }: { teamId: string }) {
  const { profile } = useAuth();
  const { data: team } = useTeam(teamId);
  const { data: channel } = useTeamChannel(teamId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const onRoster = profile && team ? team.roster.some((p) => p.userId === profile.uid) : false;
  const canPost = isStaff || onRoster;
  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendTeamMessage({ teamId, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 14 }}>
        One-way broadcast from organizers to this team — anyone on the roster can reply back.
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
        {messages.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No messages yet.</div>}
      </div>

      {canPost ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Send a message…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
          />
          <PrimaryButton disabled={sending || !draft.trim()} onClick={send}>Send</PrimaryButton>
        </div>
      ) : (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only organizers and players on this team can post here.</div>
      )}
    </div>
  );
}
