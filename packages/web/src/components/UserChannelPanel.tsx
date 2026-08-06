import { useEffect, useRef, useState } from "react";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useUserChannel } from "../hooks/useData";
import { sendUserMessage, askUmojaChannel } from "../lib/callables";
import { PrimaryButton } from "./ui";

type Target = "ai" | "organizer";

/**
 * The one merged thread: Ask Umoja (AI) and Message Organizers (human staff)
 * used to be two separate widgets with two separate data stores. Both now
 * live in this same userChannels/{uid} doc — "ai" turns never notify staff,
 * "user"/"admin" turns work exactly as they did before.
 *
 * No mode toggle: the bot is simply the default. Reaching a person is one
 * deliberate, always-visible button, not a switch you have to understand
 * up front — pressing it flips this session over to "organizer" for good
 * (no bouncing back to the bot mid-conversation), and a divider marks the
 * exact point a human's first reply lands, so the thread explains itself
 * on scroll-back for both the user and staff.
 */
export function UserChannelPanel({ uid }: { uid: string }) {
  const { profile } = useAuth();
  const { data: channel } = useUserChannel(uid);
  const [draft, setDraft] = useState("");
  const [escalated, setEscalated] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isOwner = profile?.uid === uid;
  const canPost = isStaff || isOwner;
  const canUseAi = isOwner; // staff replying on someone else's thread always talks to the person, never the bot
  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const firstAdminIndex = messages.findIndex((m) => m.from === "admin");

  const target: Target = canUseAi && !escalated ? "ai" : "organizer";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pendingTarget]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send() {
    const text = draft.trim();
    if (!text || pendingTarget === target) return;
    setDraft("");
    setError(null);
    setPendingTarget(target);
    try {
      if (canUseAi && target === "ai") {
        await askUmojaChannel({ text });
      } else {
        await sendUserMessage({ targetUid: uid, text });
      }
    } catch {
      setError(target === "ai" ? "Ask Umoja didn't answer — try again, or click Talk to an organizer below." : "Couldn't send that — try again.");
    } finally {
      setPendingTarget(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "min(60vh, 520px)" }}>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 10, flexShrink: 0 }}>
        {isOwner
          ? "Ask a question and Ask Umoja will answer right away — click Talk to an organizer below any time you need a real person."
          : isStaff
          ? "One-way channel between this user and the organizers."
          : "Message the organizers directly — an admin or the commissioner will reply here."}
      </div>

      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
            {i === firstAdminIndex && (
              <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.color.textMuted, margin: "6px 0" }}>
                — An organizer joined this conversation —
              </div>
            )}
            <div
              style={{
                alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                background: m.from === "admin" ? theme.color.navy : m.from === "ai" ? "#F1EFF5" : theme.color.purple,
                color: m.from === "admin" || m.from === "user" ? "#fff" : theme.color.text,
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13.5,
                maxWidth: "75%",
              }}
            >
              {m.from !== "user" && (
                <div style={{ fontSize: 11, fontWeight: 700, opacity: m.from === "admin" ? 0.8 : 1, color: m.from === "admin" ? "#fff" : theme.color.textMuted, marginBottom: 2 }}>
                  {m.from === "admin" ? "Organizers" : "🤖 Ask Umoja"}
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
            {canPost ? "No messages yet — ask a question below." : "No messages yet."}
          </div>
        )}
        {pendingTarget === "ai" && (
          <div style={{ alignSelf: "flex-start", background: "#F1EFF5", borderRadius: 10, padding: "8px 12px", fontSize: 13.5 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.textMuted, marginBottom: 2 }}>🤖 Ask Umoja</div>
            <span style={{ color: theme.color.textMuted, fontStyle: "italic" }}>is typing…</span>
          </div>
        )}
      </div>

      {canPost ? (
        <div style={{ flexShrink: 0, paddingTop: 10, marginTop: 8, borderTop: `1px solid ${theme.color.border}` }}>
          {canUseAi && (
            escalated ? (
              <div style={{ color: theme.color.textMuted, fontSize: 11.5, textAlign: "center", marginBottom: 8 }}>
                You're talking to an organizer now — they'll reply right here.
              </div>
            ) : (
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <button
                  onClick={() => setEscalated(true)}
                  style={{ background: "#F1EFF5", color: theme.color.navy, border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                >
                  🙋 Talk to an organizer
                </button>
              </div>
            )
          )}
          {error && <div style={{ color: theme.color.danger, fontSize: 12, marginBottom: 6 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={target === "organizer" ? "Message the organizers…" : isOwner ? "Ask a question…" : "Reply…"}
              style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
            />
            <PrimaryButton
              disabled={!draft.trim() || pendingTarget === target}
              onClick={send}
              style={{
                background: !draft.trim() || pendingTarget === target ? "#C9C3D8" : target === "organizer" ? theme.color.navy : theme.color.purple,
              }}
            >
              Send
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5, flexShrink: 0 }}>Only this user and organizers can post here.</div>
      )}
    </div>
  );
}
