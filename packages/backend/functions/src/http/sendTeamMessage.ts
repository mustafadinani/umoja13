import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, type Team, type TeamChannelMessage, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";
import { resolveAuthorName } from "../util/authorName.js";
import { notifyUsers } from "../util/notify.js";
import { notificationBodyFor, validateMessageContent } from "../util/channelAttachment.js";
import { getCurrentTeamRosterUids } from "../util/roster.js";

interface SendTeamMessageRequest {
  teamId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "photo" | "video";
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

  const { teamId, text, mediaUrl, mediaType } = request.data;
  const content = validateMessageContent(text, { mediaUrl, mediaType });

  const [userSnap, teamSnap, rosterUids] = await Promise.all([
    db.collection(COLLECTIONS.users).doc(uid).get(),
    db.collection(COLLECTIONS.teams).doc(teamId).get(),
    // The real, current roster (from registration data), not
    // `teams/{teamId}.roster` — that field is dead data from this app's own
    // pre-Outreach-import teams collection that nothing has written since,
    // and trusting it here would let a check pass or fail against a roster
    // membership from a superseded system instead of who's actually on the
    // team today.
    getCurrentTeamRosterUids(teamId),
  ]);
  if (!teamSnap.exists) throw new HttpsError("not-found", "Team not found.");

  const profile = userSnap.data() as UserProfile | undefined;
  const team = teamSnap.data() as Team;
  const isStaffCaller = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const onRoster = rosterUids.includes(uid);
  if (!isStaffCaller && !onRoster) {
    throw new HttpsError("permission-denied", "Only staff or a player on this team can post here.");
  }

  const message: TeamChannelMessage = {
    id: db.collection(COLLECTIONS.teamChannels).doc().id,
    from: isStaffCaller ? "admin" : "team",
    authorUid: uid,
    authorName: await resolveAuthorName(uid, profile?.displayName),
    ...content,
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
    await notifyUsers(rosterUids, `Message for ${team.name}`, notificationBodyFor(message));
  } else {
    const staffSnap = await db.collection(COLLECTIONS.users).where("roles", "array-contains-any", ["admin", "commissioner"]).get();
    await notifyUsers(staffSnap.docs.map((d) => d.id), `${team.name} replied`, notificationBodyFor(message));
  }

  return { message };
});
