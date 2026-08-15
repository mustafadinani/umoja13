import { useRef, useState } from "react";
import { theme } from "../../../lib/theme";
import { sendBulkEmail, type EmailAttachment } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export interface BulkEmailRecipient {
  email: string;
  name?: string;
}

const MAX_ATTACHMENTS = 3;
/** Combined limit, mirrored on the server in sendBulkEmail.ts — kept in sync manually since the two run in separate packages. */
const MAX_ATTACHMENTS_BYTES = 7 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is "data:<type>;base64,<data>" — strip the prefix, EmailAttachment carries contentType separately.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read file."));
    reader.readAsDataURL(file);
  });
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
  const [attachments, setAttachments] = useState<(EmailAttachment & { size: number })[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsBytes = attachments.reduce((sum, a) => sum + a.size, 0);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachError(null);
    const picked = Array.from(files);
    if (attachments.length + picked.length > MAX_ATTACHMENTS) {
      setAttachError(`Up to ${MAX_ATTACHMENTS} attachments.`);
      return;
    }
    const newBytes = picked.reduce((sum, f) => sum + f.size, 0);
    if (attachmentsBytes + newBytes > MAX_ATTACHMENTS_BYTES) {
      setAttachError(`Attachments are too large — ${MAX_ATTACHMENTS_BYTES / 1024 / 1024}MB combined, max.`);
      return;
    }
    try {
      const read = await Promise.all(
        picked.map(async (file) => ({
          filename: file.name,
          contentType: file.type || "application/pdf",
          base64: await readFileAsBase64(file),
          size: file.size,
        }))
      );
      setAttachments((prev) => [...prev, ...read]);
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(filename: string) {
    setAttachments((prev) => prev.filter((a) => a.filename !== filename));
  }

  async function send() {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await sendBulkEmail({
        recipients,
        subject: subject.trim(),
        body: body.trim(),
        mode,
        attachments: attachments.length > 0 ? attachments.map(({ filename, contentType, base64 }) => ({ filename, contentType, base64 })) : undefined,
      });
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

      <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Attachments (optional)</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
        {attachments.map((a) => (
          <div key={a.filename} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {a.filename} ({(a.size / 1024).toFixed(0)}KB)</span>
            <button
              onClick={() => removeAttachment(a.filename)}
              style={{ background: "none", border: "none", color: theme.color.danger, fontWeight: 700, cursor: "pointer", fontSize: 12.5, flexShrink: 0 }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {attachments.length < MAX_ATTACHMENTS && (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ background: "none", border: `1px dashed ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, color: theme.color.purple, cursor: "pointer", width: "100%", marginBottom: 6 }}
        >
          + Attach a PDF
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={(e) => void addFiles(e.target.files)} style={{ display: "none" }} />
      {attachError && <div style={{ color: theme.color.danger, fontSize: 12, marginBottom: 8 }}>{attachError}</div>}
      <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
        Needs a one-time EmailJS template setup first (see emailjs.service.ts) — and depends on the EmailJS plan supporting attachments. Test with a real send before relying on this.
      </div>

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
