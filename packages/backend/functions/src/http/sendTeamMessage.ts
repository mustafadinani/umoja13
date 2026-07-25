import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type Team, type TeamChannelMessage, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";

interface SendTeamMessageRequest {
  teamId: string;
  text: string;
}

/**
 * One-way team channel: staff broadcast to a team's roster, and any roster
 * member can reply back. `from` is derived server-side from the caller's
 * role/roster membership, not trusted from the client. Notifies the other
 * side (roster on an admin post, staff on a team reply) via the same
 * in-app-notification + push pipeline as sendNotification.
 */
export const sendTeamMessage = onCall<SendTeamMessageRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { teamId, text } = request.data;
  if (!text?.trim()) throw new HttpsError("invalid-argument", "Message text is required.");

  const [userSnap, teamSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).doc(uid).get(),
    db.collection(COLLECTIONS.teams).doc(teamId).get(),
  ]);
  if (!teamSnap.exists) throw new HttpsError("not-found", "Team not found.");

  const profile = userSnap.data() as UserProfile | undefined;
  const team = teamSnap.data() as Team;
  const isStaffCaller = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const onRoster = team.roster.some((p) => p.userId === uid);
  if (!isStaffCaller && !onRoster) {
    throw new HttpsError("permission-denied", "Only staff or a player on this team can post here.");
  }

  const message: TeamChannelMessage = {
    id: db.collection(COLLECTIONS.teamChannels).doc().id,
    from: isStaffCaller ? "admin" : "team",
    authorUid: uid,
    authorName: profile?.displayName ?? "Someone",
    text: text.trim(),
    createdAt: Date.now(),
  };

  await db.collection(COLLECTIONS.teamChannels).doc(teamId).set(
    {
      teamId,
      updatedAt: Date.now(),
      messages: FieldValue.arrayUnion(message),
    },
    { merge: true }
  );

  if (isStaffCaller) {
    const rosterUids = team.roster.map((p) => p.userId).filter(Boolean);
    await notifyUsers(rosterUids, `Message for ${team.name}`, message.text);
  } else {
    const staffSnap = await db.collection(COLLECTIONS.users).where("roles", "array-contains-any", ["admin", "commissioner"]).get();
    await notifyUsers(staffSnap.docs.map((d) => d.id), `${team.name} replied`, message.text);
  }

  return { message };
});
