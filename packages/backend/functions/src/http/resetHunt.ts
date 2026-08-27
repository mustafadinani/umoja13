import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../util/admin.js";

/**
 * Admin/commissioner-only: wipes every Hunt-mission submission and resets
 * every crew's earned score back to zero — used to clear out test-run data
 * before the real thing counts, or to fully restart the game.
 *
 * Scope is deliberately the Hunt-missions system only:
 *  - Deletes every doc in `huntSubmissions`.
 *  - Resets every `huntCrews` doc's `points` to 0 and `missionsCompleted` to [].
 *  - Deletes every `moments` doc mirrored from a Hunt submission
 *    (`source === "hunt"`) — those are pure derivatives of the submissions
 *    just deleted, so leaving them up would show photos on the public feed
 *    with no submission behind them anymore.
 *
 * Crews themselves (name/members/memberUids/locked) are left untouched — no
 * one has to re-register. The separate Challenges feature (challenges/
 * challengeSubmissions, and HuntCrew.challengesCompleted) is NOT touched —
 * it's a distinct system that happens to share the same `points` field, and
 * this function only zeroes what the Hunt missions actually contributed.
 */
export const resetHunt = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can reset the Hunt.");
  }

  const [submissionsSnap, crewsSnap, huntMomentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.huntSubmissions).get(),
    db.collection(COLLECTIONS.huntCrews).get(),
    db.collection(COLLECTIONS.moments).where("source", "==", "hunt").get(),
  ]);

  // Firestore batches cap at 500 writes — chunk every collection's docs
  // through 400-op batches (comfortable margin) rather than assuming any of
  // these stay small forever.
  const allDeletes = [...submissionsSnap.docs, ...huntMomentsSnap.docs].map((d) => d.ref);
  const crewRefs = crewsSnap.docs.map((d) => d.ref);

  const CHUNK = 400;
  for (let i = 0; i < allDeletes.length; i += CHUNK) {
    const batch = db.batch();
    for (const ref of allDeletes.slice(i, i + CHUNK)) batch.delete(ref);
    await batch.commit();
  }
  for (let i = 0; i < crewRefs.length; i += CHUNK) {
    const batch = db.batch();
    for (const ref of crewRefs.slice(i, i + CHUNK)) batch.update(ref, { points: 0, missionsCompleted: [] });
    await batch.commit();
  }

  return {
    submissionsDeleted: submissionsSnap.size,
    momentsDeleted: huntMomentsSnap.size,
    crewsReset: crewsSnap.size,
  };
});
