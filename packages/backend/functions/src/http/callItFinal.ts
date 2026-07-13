import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type Game } from "@umoja/shared";
import { db } from "../util/admin.js";

interface CallItFinalRequest {
  gameId: string;
}

/** Commissioner/admin only: finalizes a provisional game card, locking the result and triggering standings recompute. */
export const callItFinal = onCall<CallItFinalRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = userSnap.data()?.roles ?? [];
  if (!roles.includes("commissioner") && !roles.includes("admin")) {
    throw new HttpsError("permission-denied", "Only the commissioner or admin can call a game final.");
  }

  const { gameId } = request.data;
  const ref = db.collection(COLLECTIONS.games).doc(gameId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found.");
  const game = snap.data() as Game;
  if (game.gameCard?.status !== "awaiting_commissioner") {
    throw new HttpsError("failed-precondition", "No provisional game card awaiting finalization.");
  }

  await ref.set(
    {
      status: "final",
      "gameCard.status": "final",
      "gameCard.calledFinalBy": uid,
      "gameCard.calledFinalAt": Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { status: "final" };
});
