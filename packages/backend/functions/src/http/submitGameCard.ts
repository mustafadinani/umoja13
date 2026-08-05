import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type Game } from "@umoja/shared";
import { db } from "../util/admin.js";

interface SubmitGameCardRequest {
  gameId: string;
  photoUrl: string;
}

/**
 * Referee submits a photo of the paper game card. No automated score
 * reading — the commissioner reviews the photo directly and confirms the
 * score against game.events before calling it final.
 */
export const submitGameCard = onCall<SubmitGameCardRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { gameId, photoUrl } = request.data;
  const ref = db.collection(COLLECTIONS.games).doc(gameId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found.");
  const game = snap.data() as Game;
  if (game.refereeUid !== uid) throw new HttpsError("permission-denied", "Not your assigned game.");
  if (!game.gateCheck?.completedAt) {
    throw new HttpsError("failed-precondition", "Complete the gate check before submitting the game card.");
  }
  if (!game.motmUserId) {
    throw new HttpsError("failed-precondition", "Pick Man of the Match before submitting the game card.");
  }

  await ref.set(
    {
      gameCard: {
        photoUrl,
        submittedAt: Date.now(),
        submittedBy: uid,
        status: "awaiting_commissioner",
      },
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { status: "awaiting_commissioner" };
});
