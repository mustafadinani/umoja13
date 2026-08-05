import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type ChannelRole, type Pod, type Team, type UserProfile } from "@umoja/shared";
import { db } from "../util/admin.js";

type ChannelKind = "user" | "team" | "role" | "pod";

interface MarkChannelReadRequest {
  kind: ChannelKind;
  /** uid / teamId / role / podId, depending on kind. */
  id: string;
}

/**
 * Records that the caller has seen a channel's messages up to now, so
 * clients can compute unread badges (nav bell, Pods link, channel tabs)
 * without trusting a client-set "read" flag — one shared endpoint for all
 * four channel types (userChannels/teamChannels/roleChannels/podChannels)
 * instead of four near-identical callables. Permission checks mirror each
 * channel's send*Message callable and Firestore read rule.
 */
export const markChannelRead = onCall<MarkChannelReadRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { kind, id } = request.data;
  if (!id) throw new HttpsError("invalid-argument", "id is required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerProfile = callerSnap.data() as UserProfile | undefined;
  const isStaffCaller = callerProfile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;

  let collectionName: string;
  switch (kind) {
    case "user": {
      if (!isStaffCaller && id !== uid) {
        throw new HttpsError("permission-denied", "Can only mark your own channel read.");
      }
      collectionName = COLLECTIONS.userChannels;
      break;
    }
    case "team": {
      if (!isStaffCaller) {
        const teamSnap = await db.collection(COLLECTIONS.teams).doc(id).get();
        const team = teamSnap.data() as Team | undefined;
        if (!team?.roster.some((p) => p.userId === uid)) {
          throw new HttpsError("permission-denied", "Only staff or a player on this team can do this.");
        }
      }
      collectionName = COLLECTIONS.teamChannels;
      break;
    }
    case "role": {
      const role = id as ChannelRole;
      if (!isStaffCaller && !(callerProfile?.roles?.includes(role) ?? false)) {
        throw new HttpsError("permission-denied", "Only staff or a member of this role can do this.");
      }
      collectionName = COLLECTIONS.roleChannels;
      break;
    }
    case "pod": {
      if (!isStaffCaller) {
        const podSnap = await db.collection(COLLECTIONS.pods).doc(id).get();
        const pod = podSnap.data() as Pod | undefined;
        if (!pod?.memberUids.includes(uid)) {
          throw new HttpsError("permission-denied", "Only this pod's members or staff can do this.");
        }
      }
      collectionName = COLLECTIONS.podChannels;
      break;
    }
    default:
      throw new HttpsError("invalid-argument", "Unknown channel kind.");
  }

  await db.collection(collectionName).doc(id).set({ lastReadBy: { [uid]: Date.now() } }, { merge: true });
  return { ok: true };
});
