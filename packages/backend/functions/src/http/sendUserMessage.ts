import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type UserChannelMessage, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { resolveAuthorName } from "../util/authorName.js";
import { notifyUsers } from "../util/notify.js";
import { notificationBodyFor, validateMessageContent } from "../util/channelAttachment.js";

interface SendUserMessageRequest {
  /** Which user's channel to post into. Only honored for staff callers — a
   * non-staff caller always posts into their own channel, regardless of
   * what's sent here, so a message can never be spoofed into someone else's. */
  targetUid?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "photo" | "video";
}

/**
 * One-way "message the organizers" channel, scoped to a single user instead
 * of a team roster or role — the catch-all contact channel for anyone
 * (fans included) who isn't necessarily on a team or holding a role.
 * Mirrors sendTeamMessage/sendRoleMessage.
 */
export const sendUserMessage = onCall<SendUserMessageRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { text, mediaUrl, mediaType } = request.data;
  const content = validateMessageContent(text, { mediaUrl, mediaType });

  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const profile = userSnap.data() as UserProfile | undefined;
  const isStaffCaller = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;

  const targetUid = isStaffCaller ? request.data.targetUid : uid;
  if (!targetUid) throw new HttpsError("invalid-argument", "targetUid is required.");

  const message: UserChannelMessage = {
    id: db.collection(COLLECTIONS.userChannels).doc().id,
    from: isStaffCaller ? "admin" : "user",
    authorUid: uid,
    authorName: await resolveAuthorName(uid, profile?.displayName),
    ...content,
    createdAt: Date.now(),
  };

  await db.collection(COLLECTIONS.userChannels).doc(targetUid).set(
    { userId: targetUid, updatedAt: Date.now(), messages: FieldValue.arrayUnion(message) },
    { merge: true }
  );

  if (isStaffCaller) {
    await notifyUsers([targetUid], "Message from organizers", notificationBodyFor(message));
  } else {
    const staffSnap = await db.collection(COLLECTIONS.users).where("roles", "array-contains-any", ["admin", "commissioner"]).get();
    await notifyUsers(staffSnap.docs.map((d) => d.id), `Message from ${message.authorName}`, notificationBodyFor(message));
  }

  return { message };
});
