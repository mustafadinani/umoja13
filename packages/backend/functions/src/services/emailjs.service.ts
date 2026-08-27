/**
 * EmailJS email service — server-side implementation.
 *
 * Umoja Outreach's mail delivery went Mailgun → EmailJS; this app follows the
 * same choice (see @umoja/functions's sibling umoja-frontend repo for the
 * original integration this one is modeled on). We use EmailJS's REST API
 * with a single generic template so every email's actual HTML lives in code
 * (util/emailTemplates.ts) instead of being split across per-purpose
 * templates in the EmailJS dashboard.
 *
 * ── EmailJS Dashboard Setup (one-time) ─────────────────────────────────────
 * 1. Create an account at https://emailjs.com (or reuse the existing Umoja
 *    Outreach account — same org, one less set of credentials to manage).
 * 2. Add an Email Service connected to whichever address should send these
 *    (e.g. games@umojaoutreach.org) → copy its Service ID.
 * 3. Create ONE Email Template named "umoja13_generic":
 *        To:      {{to_email}}
 *        Subject: {{subject}}
 *        Body:    {{{html_content}}}   ← triple braces = unescaped HTML
 *      → copy its Template ID.
 * 4. Copy the Public Key + Private Key from Account → API Keys.
 * 5. (Optional, only needed for sendBulkEmail's "one email, everyone BCC'd"
 *    mode — the default "individual" mode needs none of this) Add a Bcc
 *    field to the same template: Bcc: {{bcc_email}}. Until this field
 *    exists on the template, EmailJS silently ignores the bcc_email param
 *    below and the email only reaches the single "to" address.
 * 6. (Optional, only needed for sendBulkEmail's PDF-attachment option) Add up
 *    to MAX_ATTACHMENTS "File Attachment" fields to the same template, named
 *    attachment_1, attachment_2, attachment_3. Until these exist on the
 *    template, an attempted attachment either gets silently dropped or the
 *    send fails outright — and whether attachments work at all also depends
 *    on the EmailJS account's plan (Free doesn't support them). There's no
 *    way to verify either of those from this codebase; test a real send with
 *    a PDF attached after adding the template fields.
 *
 * ── Wiring credentials in (Cloud Functions v2 secrets) ──────────────────────
 * Production:
 *   firebase functions:secrets:set EMAILJS_SERVICE_ID
 *   firebase functions:secrets:set EMAILJS_PUBLIC_KEY
 *   firebase functions:secrets:set EMAILJS_PRIVATE_KEY
 *   firebase functions:secrets:set EMAILJS_TEMPLATE_ID
 * (each prompts for the value interactively — same pattern as
 * STRIPE_SECRET_KEY / ANTHROPIC_API_KEY in stripeClient.ts / claudeClient.ts)
 *
 * Local emulator: put the same four values in
 * packages/backend/functions/.secret.local (git-ignored via the repo's
 * `*.local` rule) as KEY=value lines.
 *
 * Any function that sends email must declare `{ secrets: EMAIL_SECRETS }`
 * in its onCall/onDocumentCreated/onDocumentWritten options, or `.value()`
 * throws at runtime.
 */

import { defineSecret } from "firebase-functions/params";

const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";
const EMAILJS_SEND_FORM_API = "https://api.emailjs.com/api/v1.0/email/send-form";

/** EmailJS's dashboard template only has room for this many named "File Attachment" fields (attachment_1.., see setup step 6 above) — a hard ceiling on how many files one send can carry. */
export const MAX_ATTACHMENTS = 3;

export interface EmailAttachment {
  filename: string;
  contentType: string;
  /** Base64-encoded file bytes (no "data:...;base64," prefix). */
  base64: string;
}

export const emailjsServiceId: ReturnType<typeof defineSecret> = defineSecret("EMAILJS_SERVICE_ID");
export const emailjsPublicKey: ReturnType<typeof defineSecret> = defineSecret("EMAILJS_PUBLIC_KEY");
export const emailjsPrivateKey: ReturnType<typeof defineSecret> = defineSecret("EMAILJS_PRIVATE_KEY");
export const emailjsTemplateId: ReturnType<typeof defineSecret> = defineSecret("EMAILJS_TEMPLATE_ID");

/** Pass this to any onCall/trigger options `{ secrets: EMAIL_SECRETS }` that calls sendEmail. */
export const EMAIL_SECRETS: ReturnType<typeof defineSecret>[] = [
  emailjsServiceId,
  emailjsPublicKey,
  emailjsPrivateKey,
  emailjsTemplateId,
];

/**
 * Send a transactional email via EmailJS's generic template.
 *
 * @param to      Recipient email address
 * @param subject Email subject line
 * @param html    Full HTML body (rendered by util/emailTemplates.ts)
 * @param bcc     Comma-separated addresses to Bcc (see setup step 5 above
 *                — a no-op until the template has a Bcc field wired to
 *                {{bcc_email}}). Used only by sendBulkEmail's "bcc" mode.
 * @param attachments Up to MAX_ATTACHMENTS files (see setup step 6 above).
 *                When present, this switches to EmailJS's multipart
 *                send-form endpoint instead of the plain JSON one — that's
 *                the only EmailJS REST call that can carry files at all.
 */
export async function sendEmail(to: string, subject: string, html: string, bcc?: string, attachments?: EmailAttachment[]): Promise<void> {
  const serviceId = emailjsServiceId.value();
  const templateId = emailjsTemplateId.value();
  const publicKey = emailjsPublicKey.value();
  const privateKey = emailjsPrivateKey.value();

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.error("EmailJS secrets not set — see services/emailjs.service.ts header for setup.");
    throw new Error("EmailJS config not set");
  }

  if (attachments?.length) {
    const form = new FormData();
    form.append("service_id", serviceId);
    form.append("template_id", templateId);
    form.append("user_id", publicKey);
    form.append("accessToken", privateKey);
    form.append("to_email", to);
    form.append("subject", subject);
    form.append("html_content", html);
    if (bcc) form.append("bcc_email", bcc);
    attachments.slice(0, MAX_ATTACHMENTS).forEach((a, i) => {
      const blob = new Blob([Buffer.from(a.base64, "base64")], { type: a.contentType });
      form.append(`attachment_${i + 1}`, blob, a.filename);
    });

    const res = await fetch(EMAILJS_SEND_FORM_API, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text();
      console.error(`EmailJS send-form error ${res.status}:`, text);
      throw new Error(`EmailJS send failed: ${res.status} ${text}`);
    }
    console.log(`EmailJS: sent "${subject}" → ${to} with ${attachments.length} attachment(s)`);
    return;
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: to,
      subject,
      html_content: html,
      ...(bcc ? { bcc_email: bcc } : {}),
    },
  };

  const res = await fetch(EMAILJS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`EmailJS error ${res.status}:`, text);
    throw new Error(`EmailJS send failed: ${res.status} ${text}`);
  }

  console.log(`EmailJS: sent "${subject}" → ${to}`);
}
