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
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const serviceId = emailjsServiceId.value();
  const templateId = emailjsTemplateId.value();
  const publicKey = emailjsPublicKey.value();
  const privateKey = emailjsPrivateKey.value();

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.error("EmailJS secrets not set — see services/emailjs.service.ts header for setup.");
    throw new Error("EmailJS config not set");
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
