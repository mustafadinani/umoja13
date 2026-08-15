/**
 * Web Push — server-side implementation.
 *
 * Standards-based Web Push (not Firebase Cloud Messaging): a browser's
 * PushManager.subscribe() call (see web's src/lib/webPush.ts) hands back an
 * endpoint + keypair tied to that browser's own push service (Google's,
 * Mozilla's, etc.) — this file signs and delivers directly to that
 * endpoint via VAPID, with no FCM abstraction layer in between. That also
 * sidesteps needing anything from the Firebase console's Cloud Messaging
 * tab (there's no public API to fetch/generate that pairing, only a
 * console button), so the VAPID key pair here is entirely self-generated.
 *
 * ── Credentials (one-time) ─────────────────────────────────────────────────
 * Generated via `web-push`'s generateVAPIDKeys() and currently wired in as
 * plain Cloud Functions v2 project env vars (packages/backend/functions
 * /.env.umoja-app — git-ignored, NOT Secret Manager) rather than a proper
 * secret like EMAIL_SECRETS: the deploying service account currently lacks
 * secretmanager.secrets.setIamPolicy. Once that's granted, migrate
 * VAPID_PRIVATE_KEY to defineSecret the same way emailjs.service.ts does —
 * this file's public API (sendWebPush) doesn't need to change either way.
 * VAPID_PUBLIC_KEY is also duplicated (deliberately — it's meant to be
 * public) into the web app's own .env.production as VITE_VAPID_PUBLIC_KEY.
 *
 * Local emulator: put the same three values (VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY, VAPID_SUBJECT) in packages/backend/functions
 * /.env.umoja-app.local, or export them in your shell before starting it.
 */

import webpush from "web-push";
import type { WebPushSubscription } from "@umoja/shared";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.error("Web Push VAPID env vars not set — see services/webPush.service.ts header for setup.");
    throw new Error("Web Push config not set");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/**
 * True when the push service reports the subscription is permanently gone
 * (browser unsubscribed, uninstalled, or cleared site data) — the caller
 * should stop retrying and clear it from the user's doc, same idea as a
 * stale Expo push token.
 */
export function isGoneSubscriptionError(err: unknown): boolean {
  const status = (err as { statusCode?: number } | undefined)?.statusCode;
  return status === 404 || status === 410;
}

/**
 * Sends one Web Push notification. Throws on failure — caller decides how to
 * handle a gone-vs-transient error (see isGoneSubscriptionError). `url`, when
 * given, is what tapping the notification opens (see public/sw-push.js) —
 * used for a targeted alert's attached PDF link; omitted, it just
 * focuses/opens the app like every other push always has.
 */
export async function sendWebPush(subscription: WebPushSubscription, title: string, body: string, url?: string): Promise<void> {
  ensureConfigured();
  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: subscription.keys },
    JSON.stringify({ title, body, url })
  );
}
