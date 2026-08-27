import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../util/admin.js";

interface DeleteHuntCrewRequest {
  crewId: string;
}

/**
 * Admin/commissioner-only: permanently deletes one Hunt crew — for a test
 * crew, a duplicate, or one an admin needs gone for any other reason.
 * huntCrews has no `allow delete` in firestore.rules (defaults to deny), and
 * even if it did, a plain client delete would orphan this crew's own
 * submissions and any Moments mirrored from them — so this goes through the
 * Admin SDK instead, cleaning up all three in one batch:
 *  - the crew doc itself
 *  - every huntSubmissions doc with this crewId
 *  - every moments doc mirrored from one of those submissions
 *    (source === "hunt" && huntSubmissionId in the deleted set)
 */
export const deleteHuntCrew = onCall<DeleteHuntCrewRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can delete a Hunt crew.");
  }

  const { crewId } = request.data;
  if (!crewId) throw new HttpsError("invalid-argument", "crewId is required.");

  const crewRef = db.collection(COLLECTIONS.huntCrews).doc(crewId);
  const crewSnap = await crewRef.get();
  if (!crewSnap.exists) throw new HttpsError("not-found", "This crew no longer exists.");

  const [submissionsSnap, huntMomentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.huntSubmissions).where("crewId", "==", crewId).get(),
    db.collection(COLLECTIONS.moments).where("source", "==", "hunt").get(),
  ]);
  const submissionIds = new Set(submissionsSnap.docs.map((d) => d.id));
  const momentsToDelete = huntMomentsSnap.docs.filter((d) => submissionIds.has(d.data().huntSubmissionId));

  const batch = db.batch();
  batch.delete(crewRef);
  for (const d of submissionsSnap.docs) batch.delete(d.ref);
  for (const d of momentsToDelete) batch.delete(d.ref);
  await batch.commit();

  return {
    deleted: true as const,
    submissionsDeleted: submissionsSnap.size,
    momentsDeleted: momentsToDelete.length,
  };
});
