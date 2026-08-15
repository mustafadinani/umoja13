import { COLLECTIONS, type WebPushSubscription } from "@umoja/shared";
import { db } from "./admin.js";
import { sendEmail } from "../services/emailjs.service.js";
import { announcementEmail } from "./emailTemplates.js";
import { isGoneSubscriptionError, sendWebPush } from "../services/webPush.service.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Firestore batched reads/writes and Expo's push endpoint all cap batch size; chunk to stay under every limit at once. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Writes an in-app notification doc for each uid (always) and best-effort
 * sends an Expo push (native app) and/or a Web Push (browser) to any uid
 * with one of those registered. Shared by sendNotification (admin
 * broadcast) and sendTeamMessage (team channel).
 *
 * Pass `{ email: true }` (sendNotification only — team/role channel replies
 * stay push+in-app-only so a chat thread doesn't turn into an inbox) to also
 * email anyone who doesn't have a registered push channel at all, as a
 * delivery fallback for admin broadcasts / game-time reminders.
 *
 * Pass `{ link }` (a Storage download URL, e.g. an attached PDF — see
 * http/sendNotification.ts) to carry it through every channel that can show
 * one: the in-app Notification doc (rendered as a "View attachment" row —
 * see NotificationsBell.tsx / mobile NotificationsScreen.tsx), the email
 * fallback (a button in the body), and Web Push (tapping the OS notification
 * opens the link directly — see public/sw-push.js). Native Expo push has no
 * equivalent "tap opens this URL" wiring yet, so it's carried in the push
 * payload's `data` for future use but doesn't change what tapping it does today.
 */
export async function notifyUsers(
  uids: string[],
  title: string,
  body: string,
  opts: { email?: boolean; link?: string } = {}
): Promise<{ notifiedCount: number; pushCount: number; webPushCount: number; emailCount: number }> {
  const uniqueUids = [...new Set(uids)].filter(Boolean);
  if (uniqueUids.length === 0) return { notifiedCount: 0, pushCount: 0, webPushCount: 0, emailCount: 0 };

  const users: { uid: string; email?: string; pushToken?: string; webPushSubscription?: WebPushSubscription }[] = [];
  for (const batch of chunk(uniqueUids, 30)) {
    const docs = await Promise.all(batch.map((uid) => db.collection(COLLECTIONS.users).doc(uid).get()));
    for (const d of docs) {
      if (d.exists) {
        users.push({
          uid: d.id,
          email: d.data()?.email,
          pushToken: d.data()?.pushToken,
          webPushSubscription: d.data()?.webPushSubscription,
        });
      }
    }
  }

  const now = Date.now();
  for (const batch of chunk(users, 400)) {
    const writer = db.batch();
    for (const u of batch) {
      const ref = db.collection(COLLECTIONS.notifications).doc();
      writer.set(ref, { userId: u.uid, title, body, read: false, createdAt: now, ...(opts.link ? { link: opts.link } : {}) });
    }
    await writer.commit();
  }

  const pushRecipients = users
    .filter((u): u is { uid: string; pushToken: string } => !!u.pushToken?.startsWith("ExponentPushToken"));

  let pushCount = 0;
  for (const batch of chunk(pushRecipients, 100)) {
    const messages = batch.map((r) => ({ to: r.pushToken, title, body, sound: "default", ...(opts.link ? { data: { link: opts.link } } : {}) }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      // Expo returns HTTP 200 even when individual messages fail (e.g. missing
      // APNs credentials, stale token) — the real per-message result is only
      // in the response body, so res.ok alone can't be trusted for pushCount.
      const json = (await res.json()) as { data?: { status: string; message?: string }[] };
      (json.data ?? []).forEach((ticket, i) => {
        if (ticket.status === "ok") {
          pushCount++;
        } else {
          console.error(`Push failed for uid ${batch[i]?.uid}:`, ticket.message ?? ticket.status);
        }
      });
    } catch (err) {
      console.error("Expo push request failed:", err);
    }
  }

  const webPushRecipients = users.filter(
    (u): u is { uid: string; webPushSubscription: WebPushSubscription } => !!u.webPushSubscription
  );

  let webPushCount = 0;
  for (const u of webPushRecipients) {
    try {
      await sendWebPush(u.webPushSubscription, title, body, opts.link);
      webPushCount++;
    } catch (err) {
      if (isGoneSubscriptionError(err)) {
        // Browser unsubscribed/uninstalled/cleared site data — stop retrying
        // it on every future notification, same idea as a stale Expo token.
        await db.collection(COLLECTIONS.users).doc(u.uid).set({ webPushSubscription: null }, { merge: true });
      } else {
        console.error(`Web push failed for uid ${u.uid}:`, err);
      }
    }
  }

  let emailCount = 0;
  if (opts.email) {
    // Fallback channel only — anyone who already gets a push (native or web) doesn't also get emailed.
    const emailRecipients = users.filter(
      (u): u is { uid: string; email: string; pushToken?: string; webPushSubscription?: WebPushSubscription } =>
        !!u.email && !u.pushToken?.startsWith("ExponentPushToken") && !u.webPushSubscription
    );
    const { subject, html } = announcementEmail(title, body, opts.link);
    for (const batch of chunk(emailRecipients, 10)) {
      const results = await Promise.allSettled(batch.map((u) => sendEmail(u.email, subject, html)));
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          emailCount++;
        } else {
          console.error(`Email failed for uid ${batch[i]?.uid}:`, r.reason);
        }
      });
    }
  }

  return { notifiedCount: users.length, pushCount, webPushCount, emailCount };
}
