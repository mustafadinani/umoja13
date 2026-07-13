import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type Game } from "@umoja/shared";
import { db } from "../util/admin.js";

interface SubmitGameCardRequest {
  gameId: string;
  photoUrl: string;
}

/**
 * STUBBED — not wired to a real OCR/vision provider yet (per product
 * decision: build the real upload + commissioner review queue now, wire up
 * actual score-reading later). Always reports a match so the referee's
 * flow can proceed to "awaiting commissioner". Swap the body of this
 * function for a real vision call when ready; the calling contract
 * (input/output shape) is already final.
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

  // STUB: pretend the photo always matches the console score. Real
  // implementation should OCR the photo and diff it against game.events.
  const ocrResult = {
    readScore: null as string | null,
    matchesConsole: true,
    note: "STUB: OCR not yet wired up — auto-confirmed as matching.",
  };

  await ref.set(
    {
      gameCard: {
        photoUrl,
        submittedAt: Date.now(),
        submittedBy: uid,
        status: "awaiting_commissioner",
        ocr: ocrResult,
      },
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { status: "awaiting_commissioner", ocr: ocrResult };
});
