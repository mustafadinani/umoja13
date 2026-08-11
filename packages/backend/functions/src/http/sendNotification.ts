import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, ROLES, type Role } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";
import { EMAIL_SECRETS } from "../services/emailjs.service.js";

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

async function resolveRecipientUids(target: NotificationTarget): Promise<string[]> {
  if (target.type === "all") {
    const snap = await db.collection(COLLECTIONS.users).get();
    return snap.docs.map((d) => d.id);
  }

  if (target.type === "role") {
    if (!ROLES.includes(target.role)) throw new HttpsError("invalid-argument", `Unknown role: ${target.role}`);
    const snap = await db.collection(COLLECTIONS.users).where("roles", "array-contains", target.role).get();
    return snap.docs.map((d) => d.id);
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
    return [...uids];
  }

  // target.type === "users"
  return target.uids;
}

/**
 * Admin/commissioner-only: sends an announcement or targeted reminder (e.g.
 * a game-time reminder to both rosters + the assigned referee) as both an
 * in-app notification doc (always) and an Expo push message (when the
 * recipient has a registered device token).
 */
export const sendNotification = onCall<SendNotificationRequest>(
  { secrets: EMAIL_SECRETS, timeoutSeconds: 120 },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

    const callerSnap = await db.collection(COLLECTIONS.users).doc(callerUid).get();
    const callerRoles: string[] = callerSnap.data()?.roles ?? [];
    if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
      throw new HttpsError("permission-denied", "Only admin/commissioner can send notifications.");
    }

    const { title, body, target } = request.data;
    if (!title?.trim() || !body?.trim()) throw new HttpsError("invalid-argument", "title and body are required.");

    const uids = await resolveRecipientUids(target);
    return notifyUsers(uids, title, body, { email: true });
  }
);
