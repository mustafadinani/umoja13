import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type Pod, type PodChannelMessage, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";

interface SendPodMessageRequest {
  podId: string;
  text: string;
}

/**
 * Pod chat is a flat peer group, unlike sendTeamMessage/sendRoleMessage/
 * sendUserMessage's one-way staff-broadcast-plus-reply pattern — admin,
 * commissioner, referee, and volunteer all post as equals here, so there's
 * no `from: "admin" | "member"` tag on the message. Anyone on the pod's
 * roster, or staff (who can always drop into any pod), can post.
 */
export const sendPodMessage = onCall<SendPodMessageRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { podId, text } = request.data;
  if (!podId) throw new HttpsError("invalid-argument", "podId is required.");
  if (!text?.trim()) throw new HttpsError("invalid-argument", "Message text is required.");

  const [userSnap, podSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).doc(uid).get(),
    db.collection(COLLECTIONS.pods).doc(podId).get(),
  ]);
  if (!podSnap.exists) throw new HttpsError("not-found", "Pod not found.");

  const profile = userSnap.data() as UserProfile | undefined;
  const pod = podSnap.data() as Pod;
  const isStaffCaller = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isMember = pod.memberUids.includes(uid);
  if (!isStaffCaller && !isMember) {
    throw new HttpsError("permission-denied", "Only pod members or staff can post here.");
  }

  const message: PodChannelMessage = {
    id: db.collection(COLLECTIONS.podChannels).doc().id,
    authorUid: uid,
    authorName: profile?.displayName ?? "Someone",
    text: text.trim(),
    createdAt: Date.now(),
  };

  await db.collection(COLLECTIONS.podChannels).doc(podId).set(
    {
      podId,
      updatedAt: Date.now(),
      messages: FieldValue.arrayUnion(message),
    },
    { merge: true }
  );

  const recipients = pod.memberUids.filter((u) => u !== uid);
  await notifyUsers(recipients, `${pod.name} · ${message.authorName}`, message.text);

  return { message };
});
