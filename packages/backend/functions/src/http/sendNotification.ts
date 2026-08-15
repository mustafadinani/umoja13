import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, ROLES, type Role } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";
import { getCurrentTeamRosterUids } from "../util/roster.js";
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
  /** A Storage download URL for an attached PDF — see NotificationsAdminTab.tsx (client uploads first, then passes the URL here). */
  link?: string;
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
    // The real, current roster from registration data — not
    // `teams/{teamId}.roster`, which is dead data from this app's own
    // pre-Outreach-import teams collection (see util/roster.ts).
    const [homeUids, awayUids] = await Promise.all([
      getCurrentTeamRosterUids(game.homeTeamId),
      getCurrentTeamRosterUids(game.awayTeamId),
    ]);
    const uids = new Set<string>([...homeUids, ...awayUids]);
    for (const refUid of game.refereeUids ?? []) uids.add(refUid);
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

    const { title, body, target, link } = request.data;
    if (!title?.trim() || !body?.trim()) throw new HttpsError("invalid-argument", "title and body are required.");
    if (link && !/^https:\/\//.test(link)) throw new HttpsError("invalid-argument", "link must be an https:// URL.");

    const uids = await resolveRecipientUids(target);
    return notifyUsers(uids, title, body, { email: true, link });
  }
);
