import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type Pod, type PodTask, type PodTaskMessage, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { resolveAuthorName } from "../util/authorName.js";
import { notifyUsers } from "../util/notify.js";

interface SendPodTaskMessageRequest {
  taskId: string;
  text: string;
}

/**
 * Discussion thread scoped to one pod TASK. Unlike a shift's Q&A (gated to
 * staff or that one assignee), a pod task has no single owner — it's a
 * shared checklist item any pod member can toggle — so any pod member or
 * staff can comment here too.
 */
export const sendPodTaskMessage = onCall<SendPodTaskMessageRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { taskId, text } = request.data;
  if (!text?.trim()) throw new HttpsError("invalid-argument", "Message text is required.");

  const taskRef = db.collection(COLLECTIONS.podTasks).doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new HttpsError("not-found", "Task not found.");
  const task = taskSnap.data() as PodTask;

  const podSnap = await db.collection(COLLECTIONS.pods).doc(task.podId).get();
  const pod = podSnap.data() as Pod | undefined;

  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const profile = userSnap.data() as UserProfile | undefined;
  const isStaffCaller = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!pod?.memberUids.includes(uid);
  if (!isStaffCaller && !isPodMember) {
    throw new HttpsError("permission-denied", "Only this pod's members or staff can post here.");
  }

  const message: PodTaskMessage = {
    id: db.collection(COLLECTIONS.podTasks).doc().id,
    authorUid: uid,
    authorName: await resolveAuthorName(uid, profile?.displayName),
    text: text.trim(),
    createdAt: Date.now(),
  };

  await taskRef.set({ messages: FieldValue.arrayUnion(message) }, { merge: true });

  const notifyUids = (pod?.memberUids ?? []).filter((memberUid) => memberUid !== uid);
  if (notifyUids.length > 0) {
    await notifyUsers(notifyUids, `${message.authorName} commented on "${task.title}"`, message.text);
  }

  return { message };
});
