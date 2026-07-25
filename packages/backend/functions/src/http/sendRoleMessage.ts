import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type ChannelRole, type RoleChannelMessage, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";

interface SendRoleMessageRequest {
  role: ChannelRole;
  text: string;
}

const ROLE_LABEL: Record<ChannelRole, string> = { volunteer: "Volunteers", referee: "Referees" };

/**
 * One-way role channel (Volunteers/Referees): staff broadcast to everyone
 * holding that role, and any member with the role can reply back. `from` is
 * derived server-side from the caller's roles, not trusted from the client.
 * Mirrors sendTeamMessage, but scoped by role instead of a team's roster.
 */
export const sendRoleMessage = onCall<SendRoleMessageRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { role, text } = request.data;
  if (role !== "volunteer" && role !== "referee") throw new HttpsError("invalid-argument", "Unknown channel role.");
  if (!text?.trim()) throw new HttpsError("invalid-argument", "Message text is required.");

  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const profile = userSnap.data() as UserProfile | undefined;
  const isStaffCaller = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const hasRole = profile?.roles?.includes(role) ?? false;
  if (!isStaffCaller && !hasRole) {
    throw new HttpsError("permission-denied", `Only staff or a ${role} can post here.`);
  }

  const message: RoleChannelMessage = {
    id: db.collection(COLLECTIONS.roleChannels).doc().id,
    from: isStaffCaller ? "admin" : "member",
    authorUid: uid,
    authorName: profile?.displayName ?? "Someone",
    text: text.trim(),
    createdAt: Date.now(),
  };

  await db.collection(COLLECTIONS.roleChannels).doc(role).set(
    {
      role,
      updatedAt: Date.now(),
      messages: FieldValue.arrayUnion(message),
    },
    { merge: true }
  );

  if (isStaffCaller) {
    const roleSnap = await db.collection(COLLECTIONS.users).where("roles", "array-contains", role).get();
    await notifyUsers(roleSnap.docs.map((d) => d.id), `Message for ${ROLE_LABEL[role]}`, message.text);
  } else {
    const staffSnap = await db.collection(COLLECTIONS.users).where("roles", "array-contains-any", ["admin", "commissioner"]).get();
    await notifyUsers(staffSnap.docs.map((d) => d.id), `${ROLE_LABEL[role]} channel reply`, message.text);
  }

  return { message };
});
