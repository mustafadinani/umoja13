import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type VolunteerTask, type VolunteerTaskMessage, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";

interface SendVolunteerTaskMessageRequest {
  taskId: string;
  text: string;
}

/**
 * One-way-broadcast-plus-reply, but scoped to a single shift instead of a
 * team/role/user — so when staff sees a reply they always know exactly which
 * task, who, where, and when it's about, without having to ask.
 */
export const sendVolunteerTaskMessage = onCall<SendVolunteerTaskMessageRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { taskId, text } = request.data;
  if (!text?.trim()) throw new HttpsError("invalid-argument", "Message text is required.");

  const taskRef = db.collection(COLLECTIONS.volunteerTasks).doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new HttpsError("not-found", "Shift not found.");
  const task = taskSnap.data() as VolunteerTask;

  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const profile = userSnap.data() as UserProfile | undefined;
  const isStaffCaller = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isAssignee = task.assigneeUid === uid;
  if (!isStaffCaller && !isAssignee) {
    throw new HttpsError("permission-denied", "Only staff or this shift's volunteer can post here.");
  }

  const message: VolunteerTaskMessage = {
    id: db.collection(COLLECTIONS.volunteerTasks).doc().id,
    from: isStaffCaller ? "admin" : "member",
    authorUid: uid,
    authorName: profile?.displayName ?? "Someone",
    text: text.trim(),
    createdAt: Date.now(),
  };

  await taskRef.set({ messages: FieldValue.arrayUnion(message) }, { merge: true });

  if (isStaffCaller) {
    if (task.assigneeUid) await notifyUsers([task.assigneeUid], `Re: ${task.title}`, message.text);
  } else {
    const staffSnap = await db.collection(COLLECTIONS.users).where("roles", "array-contains-any", ["admin", "commissioner"]).get();
    await notifyUsers(
      staffSnap.docs.map((d) => d.id),
      `${message.authorName} asked about "${task.title}"`,
      `${task.time} · ${task.location} — ${message.text}`
    );
  }

  return { message };
});
