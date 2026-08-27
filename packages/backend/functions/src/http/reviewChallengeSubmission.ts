import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type Challenge, type ChallengeSubmission, type HuntCrew } from "@umoja/shared";
import { db } from "../util/admin.js";

interface ReviewChallengeSubmissionRequest {
  submissionId: string;
  decision: "approve" | "reject";
  /** Only meaningful when decision === "reject" — shown back to the crew. */
  rejectionReason?: string;
}

/**
 * Admin/commissioner-only: approves or rejects a Challenge submission.
 * Early-bird bonus rank is computed from submission time across ALL of this
 * challenge's submissions (not review order) — an earlier submission keeps
 * its earlier rank even if it's reviewed after a later one, but only an
 * approved submission actually collects the bonus.
 */
export const reviewChallengeSubmission = onCall<ReviewChallengeSubmissionRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = callerSnap.data()?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can review challenge submissions.");
  }

  const { submissionId, decision, rejectionReason } = request.data;
  const ref = db.collection(COLLECTIONS.challengeSubmissions).doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Submission not found.");
  const submission = snap.data() as ChallengeSubmission;

  const now = Date.now();

  if (decision === "reject") {
    await ref.set(
      { status: "rejected", reviewedBy: uid, reviewedAt: now, rejectionReason: rejectionReason || "Not approved" },
      { merge: true }
    );
    return { status: "rejected" };
  }

  const allSnap = await db
    .collection(COLLECTIONS.challengeSubmissions)
    .where("challengeId", "==", submission.challengeId)
    .orderBy("createdAt", "asc")
    .get();
  const rank = allSnap.docs.findIndex((d) => d.id === submissionId);

  const challengeSnap = await db.collection(COLLECTIONS.challenges).doc(submission.challengeId).get();
  if (!challengeSnap.exists) throw new HttpsError("not-found", "Challenge not found.");
  const challenge = challengeSnap.data() as Challenge;

  const bonus = rank >= 0 && rank < challenge.earlyBirdBonuses.length ? challenge.earlyBirdBonuses[rank] : 0;
  const total = challenge.points + bonus;

  await ref.set(
    { status: "approved", reviewedBy: uid, reviewedAt: now, submissionRank: rank, bonusPoints: bonus },
    { merge: true }
  );

  const crewRef = db.collection(COLLECTIONS.huntCrews).doc(submission.crewId);
  const crewSnap = await crewRef.get();
  if (crewSnap.exists) {
    const crew = crewSnap.data() as HuntCrew;
    const challengesCompleted = crew.challengesCompleted ?? [];
    if (!challengesCompleted.includes(submission.challengeId)) {
      await crewRef.set(
        {
          points: crew.points + total,
          challengesCompleted: [...challengesCompleted, submission.challengeId],
        },
        { merge: true }
      );
    }
  }

  // Mirror an approved submission onto the Moments wall so the whole
  // community can see it — matches how approved Hunt mission submissions work.
  await db.collection(COLLECTIONS.moments).add({
    mediaType: submission.mediaType,
    mediaUrl: submission.mediaUrl,
    caption: challenge.title,
    postedBy: submission.submittedBy,
    postedByName: submission.submittedByName,
    source: "hunt",
    huntSubmissionId: submissionId,
    likeUids: [],
    moderationStatus: "approved",
    createdAt: now,
  });

  return { status: "approved", bonusPoints: bonus, rank };
});
