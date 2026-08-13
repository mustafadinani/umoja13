import { useState } from "react";
import { theme } from "../../../lib/theme";
import { sendBulkEmail } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export interface BulkEmailRecipient {
  email: string;
  name?: string;
}

/**
 * Compose-and-send panel for any admin list view that already has a "copy
 * N emails (deduped, matches filters above)" button — `recipients` should
 * be exactly that same filtered/deduped list, so what gets emailed always
 * matches what's on screen (Check-ins review queue, Players tab, ...).
 */
export function BulkEmailModal({ recipients, onClose }: { recipients: BulkEmailRecipient[]; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"individual" | "bcc">("individual");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await sendBulkEmail({ recipients, subject: subject.trim(), body: body.trim(), mode });
      setResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send this email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        Email {recipients.length} {recipients.length === 1 ? "person" : "people"}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        Sent through EmailJS — same address the app's other emails come from.
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <ModeButton active={mode === "individual"} onClick={() => setMode("individual")}>
          Individual emails
        </ModeButton>
        <ModeButton active={mode === "bcc"} onClick={() => setMode("bcc")}>
          One email, all Bcc'd
        </ModeButton>
      </div>
      <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
        {mode === "individual"
          ? "Each person gets their own email, greeted by name where we have one on file. Recommended — works today, no extra setup."
          : "One email is actually sent, to info@umojaoutreach.org, with everyone else Bcc'd on it — nobody's greeted by name. Needs a one-time Bcc field added to the EmailJS template first (ask your engineer if this doesn't seem to reach anyone)."}
      </div>

      <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Subject</label>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject line…"
        style={{ width: "100%", padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 12 }}
      />

      <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Message</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={mode === "individual" ? "We'll open with \"Hi {first name},\" automatically — just write the message itself…" : "We'll open with \"Hello,\" since this one email goes to everyone at once…"}
        rows={6}
        style={{ width: "100%", padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 16, resize: "vertical", fontFamily: "inherit" }}
      />

      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {result && (
        <div style={{ fontSize: 13, marginBottom: 12, color: result.failed.length > 0 ? theme.color.warning : theme.color.success, fontWeight: 700 }}>
          {mode === "bcc"
            ? `✓ Sent to info@umojaoutreach.org with ${result.sent} Bcc'd.`
            : `✓ Sent to ${result.sent} of ${recipients.length}.`}
          {result.failed.length > 0 && ` ${result.failed.length} failed: ${result.failed.slice(0, 3).join(", ")}${result.failed.length > 3 ? "…" : ""}`}
        </div>
      )}

      <PrimaryButton onClick={send} disabled={sending || !subject.trim() || !body.trim()} style={{ width: "100%" }}>
        {sending ? "Sending…" : `Send to ${recipients.length}`}
      </PrimaryButton>
    </Modal>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: theme.radius.sm,
        border: `1px solid ${active ? theme.color.purple : theme.color.border}`,
        background: active ? theme.color.purple : "none",
        color: active ? "#fff" : theme.color.text,
        fontWeight: 700,
        fontSize: 12.5,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
