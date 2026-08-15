import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { EMAIL_SECRETS, MAX_ATTACHMENTS, sendEmail, type EmailAttachment } from "../services/emailjs.service.js";
import { adminBulkEmail } from "../util/emailTemplates.js";

const MAX_RECIPIENTS = 500;
/** How many EmailJS sends run at once in "individual" mode — a plain loop of a few hundred sequential calls is slow enough to risk the callable's own timeout; unbounded parallelism risks EmailJS rate-limiting instead. */
const CONCURRENCY = 5;
const DEFAULT_BCC_TO = "info@umojaoutreach.org";
/** Combined decoded size of all attachments — comfortably under the ~10MB request-body ceiling a Cloud Functions callable enforces (base64 inflates the wire size by ~33% on top of this). */
const MAX_ATTACHMENTS_BYTES = 7 * 1024 * 1024;

interface Recipient {
  email: string;
  /** Personalizes the greeting in "individual" mode — omit and it just says "Hello,". */
  name?: string;
}

interface SendBulkEmailRequest {
  recipients: Recipient[];
  subject: string;
  body: string;
  /** "individual": one personalized email per recipient (default, recommended — works with no extra setup). "bcc": one email to bccTo with every recipient Bcc'd on it (needs the one-time EmailJS template step — see emailjs.service.ts). */
  mode: "individual" | "bcc";
  /** Only used in "bcc" mode. Defaults to info@umojaoutreach.org. */
  bccTo?: string;
  /** Up to MAX_ATTACHMENTS files, same ones attached to every recipient's email — needs a one-time EmailJS template step, see emailjs.service.ts. */
  attachments?: EmailAttachment[];
}

/**
 * Admin-composed bulk email from any admin list view that already has a
 * "copy emails" affordance (Check-ins review queue, Players tab, ...) — the
 * caller passes exactly the same filtered/deduped recipient list that
 * button would copy, so what gets emailed always matches what's on screen.
 */
export const sendBulkEmail = onCall<SendBulkEmailRequest>({ secrets: EMAIL_SECRETS }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const isStaff = (callerSnap.data() as UserProfile | undefined)?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  if (!isStaff) throw new HttpsError("permission-denied", "Only admin/commissioner can send bulk email.");

  const { subject, body, mode } = request.data;
  if (!subject?.trim() || !body?.trim()) throw new HttpsError("invalid-argument", "subject and body are required.");
  if (mode !== "individual" && mode !== "bcc") throw new HttpsError("invalid-argument", "mode must be \"individual\" or \"bcc\".");

  // Dedup by lowercased email — the same address can legitimately appear
  // twice (e.g. siblings sharing one family email across two registration
  // rows), and a bcc-mode send would otherwise list it on the Bcc line twice.
  const seen = new Set<string>();
  const recipients = (request.data.recipients ?? [])
    .filter((r): r is Recipient => !!r?.email?.trim())
    .filter((r) => {
      const key = r.email.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (recipients.length === 0) throw new HttpsError("invalid-argument", "At least one recipient is required.");
  if (recipients.length > MAX_RECIPIENTS) {
    throw new HttpsError("invalid-argument", `Too many recipients (${recipients.length}, max ${MAX_RECIPIENTS}) — narrow your filters first.`);
  }

  const attachments = request.data.attachments ?? [];
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new HttpsError("invalid-argument", `Too many attachments (${attachments.length}, max ${MAX_ATTACHMENTS}).`);
  }
  const attachmentsBytes = attachments.reduce((sum, a) => sum + Buffer.byteLength(a.base64, "base64"), 0);
  if (attachmentsBytes > MAX_ATTACHMENTS_BYTES) {
    throw new HttpsError("invalid-argument", `Attachments are too large (${(attachmentsBytes / 1024 / 1024).toFixed(1)}MB, max ${MAX_ATTACHMENTS_BYTES / 1024 / 1024}MB combined).`);
  }

  if (mode === "bcc") {
    const bccTo = request.data.bccTo?.trim() || DEFAULT_BCC_TO;
    const { subject: renderedSubject, html } = adminBulkEmail(undefined, subject, body);
    await sendEmail(bccTo, renderedSubject, html, recipients.map((r) => r.email.trim()).join(","), attachments);
    return { sent: recipients.length, failed: [] };
  }

  const failed: string[] = [];
  let sent = 0;
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (r) => {
        const { subject: renderedSubject, html } = adminBulkEmail(r.name, subject, body);
        try {
          await sendEmail(r.email.trim(), renderedSubject, html, undefined, attachments);
          return true;
        } catch (err) {
          console.error(`sendBulkEmail: failed to send to ${r.email}:`, err);
          return false;
        }
      })
    );
    results.forEach((ok, idx) => (ok ? sent++ : failed.push(batch[idx].email)));
  }

  return { sent, failed };
});
