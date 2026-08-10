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

/** Throws unless the caller is signed in with an admin/commissioner role — same gate as postAnnouncement, shared by update/delete below. */
async function assertStaff(callerUid: string | undefined): Promise<void> {
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");
  const callerSnap = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can manage announcements.");
  }
}

interface UpdateAnnouncementRequest {
  id: string;
  title: string;
  body: string;
}

/** Admin/commissioner-only: edits a previously-posted announcement in place. Does not re-notify — alsoNotify is a one-time send at post time, not on every edit. */
export const updateAnnouncement = onCall<UpdateAnnouncementRequest>(async (request) => {
  await assertStaff(request.auth?.uid);

  const { id, title, body } = request.data;
  if (!id) throw new HttpsError("invalid-argument", "id is required.");
  if (!title?.trim() || !body?.trim()) throw new HttpsError("invalid-argument", "title and body are required.");

  const ref = db.collection(COLLECTIONS.announcements).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Announcement not found.");

  await ref.update({ title: title.trim(), body: body.trim() });
  return { id };
});

interface DeleteAnnouncementRequest {
  id: string;
}

/** Admin/commissioner-only: removes an announcement. It disappears from Home/inbox everywhere immediately via the live onSnapshot listeners. */
export const deleteAnnouncement = onCall<DeleteAnnouncementRequest>(async (request) => {
  await assertStaff(request.auth?.uid);

  const { id } = request.data;
  if (!id) throw new HttpsError("invalid-argument", "id is required.");

  await db.collection(COLLECTIONS.announcements).doc(id).delete();
  return { id };
});
