import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, ROLES, type Role } from "@umoja/shared";
import { db } from "../util/admin.js";

type NotificationTarget =
  | { type: "all" }
  | { type: "role"; role: Role }
  | { type: "game"; gameId: string }
  | { type: "users"; uids: string[] };

interface SendNotificationRequest {
  title: string;
  body: string;
  target: NotificationTarget;
}

interface RecipientUser {
  uid: string;
  pushToken?: string;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Firestore 'in' queries accept at most 30 values per clause. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function resolveRecipients(target: NotificationTarget): Promise<RecipientUser[]> {
  if (target.type === "all") {
    const snap = await db.collection(COLLECTIONS.users).get();
    return snap.docs.map((d) => ({ uid: d.id, pushToken: d.data().pushToken }));
  }

  if (target.type === "role") {
    if (!ROLES.includes(target.role)) throw new HttpsError("invalid-argument", `Unknown role: ${target.role}`);
    const snap = await db.collection(COLLECTIONS.users).where("roles", "array-contains", target.role).get();
    return snap.docs.map((d) => ({ uid: d.id, pushToken: d.data().pushToken }));
  }

  if (target.type === "game") {
    const gameSnap = await db.collection(COLLECTIONS.games).doc(target.gameId).get();
    if (!gameSnap.exists) throw new HttpsError("not-found", "Game not found.");
    const game = gameSnap.data()!;
    const [homeSnap, awaySnap] = await Promise.all([
      db.collection(COLLECTIONS.teams).doc(game.homeTeamId).get(),
      db.collection(COLLECTIONS.teams).doc(game.awayTeamId).get(),
    ]);
    const uids = new Set<string>();
    for (const teamSnap of [homeSnap, awaySnap]) {
      const roster: { userId: string }[] = teamSnap.data()?.roster ?? [];
      roster.forEach((p) => p.userId && uids.add(p.userId));
    }
    if (game.refereeUid) uids.add(game.refereeUid);
    return resolveRecipients({ type: "users", uids: [...uids] });
  }

  // target.type === "users"
  const uids = [...new Set(target.uids)].filter(Boolean);
  const users: RecipientUser[] = [];
  for (const batch of chunk(uids, 30)) {
    const docs = await Promise.all(batch.map((uid) => db.collection(COLLECTIONS.users).doc(uid).get()));
    for (const d of docs) {
      if (d.exists) users.push({ uid: d.id, pushToken: d.data()?.pushToken });
    }
  }
  return users;
}

/**
 * Admin/commissioner-only: sends an announcement or targeted reminder (e.g.
 * a game-time reminder to both rosters + the assigned referee) as both an
 * in-app notification doc (always) and an Expo push message (when the
 * recipient has a registered device token).
 */
export const sendNotification = onCall<SendNotificationRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can send notifications.");
  }

  const { title, body, target } = request.data;
  if (!title?.trim() || !body?.trim()) throw new HttpsError("invalid-argument", "title and body are required.");

  const recipients = await resolveRecipients(target);
  const now = Date.now();

  const writeBatches = chunk(recipients, 400);
  for (const batch of writeBatches) {
    const writer = db.batch();
    for (const r of batch) {
      const ref = db.collection(COLLECTIONS.notifications).doc();
      writer.set(ref, { userId: r.uid, title, body, read: false, createdAt: now });
    }
    await writer.commit();
  }

  const pushTokens = recipients
    .map((r) => r.pushToken)
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

  return { notifiedCount: recipients.length, pushCount };
});
