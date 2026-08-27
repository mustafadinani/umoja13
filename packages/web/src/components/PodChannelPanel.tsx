import { useState } from "react";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { usePodChannel } from "../hooks/useData";
import { sendPodMessage } from "../lib/callables";
import { PrimaryButton } from "./ui";
import { ChannelAttachButton } from "./ChannelAttachButton";
import { ChannelAttachmentThumb } from "./ChannelAttachmentThumb";
import { Lightbox } from "./Lightbox";
import type { ChannelAttachment } from "../lib/uploadChannelAttachment";

/**
 * Flat peer group chat for a Pod — unlike RoleChannelPanel/UserChannelPanel,
 * messages align by "is this me" rather than "is this staff," since admin,
 * commissioner, referee, and volunteer all post as equals here.
 */
export function PodChannelPanel({ podId, canPost }: { podId: string; canPost: boolean }) {
  const { profile } = useAuth();
  const { data: channel } = usePodChannel(podId);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<ChannelAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<ChannelAttachment | null>(null);

  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function send() {
    if (!draft.trim() && !attachment) return;
    setSending(true);
    try {
      await sendPodMessage({ podId, text: draft, ...(attachment ?? {}) });
      setDraft("");
      setAttachment(null);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {messages.map((m) => {
          const isMe = m.authorUid === profile?.uid;
          return (
            <div
              key={m.id}
              style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                background: isMe ? theme.color.navy : "#F1EFF5",
                color: isMe ? "#fff" : theme.color.text,
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13.5,
                maxWidth: "75%",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 2 }}>{isMe ? "You" : m.authorName}</div>
              {m.mediaUrl && m.mediaType && (
                <ChannelAttachmentThumb mediaUrl={m.mediaUrl} mediaType={m.mediaType} onClick={() => setLightbox({ mediaUrl: m.mediaUrl!, mediaType: m.mediaType! })} />
              )}
              {m.text && <div style={{ marginTop: m.mediaUrl ? 6 : 0 }}>{m.text}</div>}
            </div>
          );
        })}
        {messages.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No messages yet.</div>}
      </div>

      {canPost ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <ChannelAttachButton value={attachment} onChange={setAttachment} disabled={sending} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Send a message…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
          />
          <PrimaryButton disabled={sending || (!draft.trim() && !attachment)} onClick={send}>Send</PrimaryButton>
        </div>
      ) : (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only pod members can post here.</div>
      )}

      {lightbox && <Lightbox src={lightbox.mediaUrl} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
    </div>
  );
}
