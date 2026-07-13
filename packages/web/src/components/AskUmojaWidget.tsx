import { useRef, useState, useEffect } from "react";
import type { ChatEscalationTopic } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { askUmoja, escalateChat } from "../lib/callables";
import { PrimaryButton, Pill } from "./ui";

interface Msg { role: "user" | "assistant"; text: string }

const TOPICS: { id: ChatEscalationTopic; label: string }[] = [
  { id: "schedule_question", label: "Schedule question" },
  { id: "checkin_passes", label: "Check-in / passes" },
  { id: "lost_and_found", label: "Lost & found" },
  { id: "medical_safety", label: "Medical / safety" },
  { id: "vendors_sponsors", label: "Vendors / sponsors" },
  { id: "something_else", label: "Something else" },
];

export function AskUmojaWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"chat" | "form" | "sent">("chat");
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: "Hi! I'm Ask Umoja. What can I help with?" }]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState<ChatEscalationTopic>("something_else");
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    if (!draft.trim() || !user) return;
    const next: Msg[] = [...messages, { role: "user", text: draft }];
    setMessages(next);
    setDraft("");
    setSending(true);
    try {
      const res = await askUmoja({ transcript: next.slice(0, -1), message: draft });
      setMessages((m) => [...m, { role: "assistant", text: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't reach the assistant just now." }]);
    } finally {
      setSending(false);
    }
  }

  async function submitEscalation() {
    if (!user) return;
    const res = await escalateChat({ transcript: messages, topic, message: draft || "Still stuck — please help." });
    setTicketNumber(res.data.ticketNumber);
    setMode("sent");
  }

  if (!user) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 90 }}>
      {open && (
        <div style={{ width: 320, height: 420, background: "#fff", borderRadius: theme.radius.lg, boxShadow: "0 10px 40px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", marginBottom: 10, overflow: "hidden" }}>
          <div style={{ background: theme.color.navy, color: "#fff", padding: "12px 16px", fontWeight: 700 }}>Ask Umoja</div>

          {mode === "chat" && (
            <>
              <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? theme.color.purple : "#F1EFF5", color: m.role === "user" ? "#fff" : theme.color.text, borderRadius: 12, padding: "8px 12px", fontSize: 13.5, maxWidth: "85%" }}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div style={{ padding: 10, borderTop: `1px solid ${theme.color.border}` }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Ask a question…"
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                  />
                  <button onClick={send} disabled={sending} style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontWeight: 700 }}>→</button>
                </div>
                <div onClick={() => setMode("form")} style={{ fontSize: 12, color: theme.color.blue, fontWeight: 600, marginTop: 8, cursor: "pointer", textAlign: "center" }}>
                  Still stuck? Ask an organizer →
                </div>
              </div>
            </>
          )}

          {mode === "form" && (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>What's this about?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TOPICS.map((t) => (
                  <Pill key={t.id} active={topic === t.id} onClick={() => setTopic(t.id)}>{t.label}</Pill>
                ))}
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Tell us what's going on…"
                rows={4}
                style={{ padding: 10, borderRadius: 8, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none" }}
              />
              <PrimaryButton onClick={submitEscalation}>SEND TO AN ORGANIZER</PrimaryButton>
            </div>
          )}

          {mode === "sent" && (
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>✓</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>We've got it.</div>
              <div style={{ fontSize: 13, color: theme.color.textMuted, marginTop: 6 }}>
                Case #{ticketNumber} is with an organizer. You'll get a notification when there's an update.
              </div>
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: 56, height: 56, borderRadius: "50%", background: theme.color.navy, color: "#fff", border: "none", fontSize: 22, boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}
      >
        💬
      </button>
    </div>
  );
}
