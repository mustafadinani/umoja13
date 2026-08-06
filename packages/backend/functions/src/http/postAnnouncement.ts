import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";

interface PostAnnouncementRequest {
  title: string;
  body: string;
  /** When set, also fans this out as a personal notification (+ push) to everyone, on top of the public announcement post. */
  alsoNotify?: boolean;
}

/** Admin/commissioner-only: posts a public bulletin to the announcements collection, with an opt-in to also notify everyone directly — one post can do both instead of admins double-posting in two tabs. */
export const postAnnouncement = onCall<PostAnnouncementRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const caller = callerSnap.data();
  const callerRoles: string[] = caller?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can post announcements.");
  }

  const { title, body, alsoNotify } = request.data;
  if (!title?.trim() || !body?.trim()) throw new HttpsError("invalid-argument", "title and body are required.");

  const ref = await db.collection(COLLECTIONS.announcements).add({
    title: title.trim(),
    body: body.trim(),
    postedAt: Date.now(),
    postedByUid: callerUid,
    postedByName: caller?.displayName ?? "Umoja",
  });

  if (!alsoNotify) return { id: ref.id, notifiedCount: 0, pushCount: 0 };

  const usersSnap = await db.collection(COLLECTIONS.users).get();
  const { notifiedCount, pushCount } = await notifyUsers(usersSnap.docs.map((d) => d.id), title, body);
  return { id: ref.id, notifiedCount, pushCount };
});
