import { COLLECTIONS } from "@umoja/shared";
import { db } from "./admin.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Firestore batched reads/writes and Expo's push endpoint all cap batch size; chunk to stay under every limit at once. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Writes an in-app notification doc for each uid (always) and best-effort
 * sends an Expo push to any uid with a registered device token. Shared by
 * sendNotification (admin broadcast) and sendTeamMessage (team channel).
 */
export async function notifyUsers(
  uids: string[],
  title: string,
  body: string
): Promise<{ notifiedCount: number; pushCount: number }> {
  const uniqueUids = [...new Set(uids)].filter(Boolean);
  if (uniqueUids.length === 0) return { notifiedCount: 0, pushCount: 0 };

  const users: { uid: string; pushToken?: string }[] = [];
  for (const batch of chunk(uniqueUids, 30)) {
    const docs = await Promise.all(batch.map((uid) => db.collection(COLLECTIONS.users).doc(uid).get()));
    for (const d of docs) {
      if (d.exists) users.push({ uid: d.id, pushToken: d.data()?.pushToken });
    }
  }

  const now = Date.now();
  for (const batch of chunk(users, 400)) {
    const writer = db.batch();
    for (const u of batch) {
      const ref = db.collection(COLLECTIONS.notifications).doc();
      writer.set(ref, { userId: u.uid, title, body, read: false, createdAt: now });
    }
    await writer.commit();
  }

  const pushTokens = users
    .map((u) => u.pushToken)
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));

  let pushCount = 0;
  for (const batch of chunk(pushTokens, 100)) {
    const messages = batch.map((to) => ({ to, title, body, sound: "default" }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      if (res.ok) pushCount += batch.length;
    } catch {
      // Best-effort: in-app notification docs are already written regardless of push delivery.
    }
  }

  return { notifiedCount: users.length, pushCount };
}
