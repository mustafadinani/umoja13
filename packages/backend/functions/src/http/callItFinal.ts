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

  // Dotted string keys (e.g. "gameCard.status") are NOT parsed as nested
  // field paths by set(..., {merge:true}) the way they are by update()/
  // updateDoc() — the Admin SDK's merge-mask builder treats a dotted string
  // key as one literal top-level field name (see DocumentMask.fromObject).
  // That silently created three bogus top-level fields here instead of
  // touching the real nested gameCard.status, so the game never actually
  // finalized: the commissioner's "awaiting_commissioner" query (which DOES
  // address the nested field correctly, since Firestore query field paths
  // always split on dots) kept matching, making the button reappear, and a
  // second click "succeeded" again for the same reason. Nest gameCard as a
  // real object instead.
  await ref.set(
    {
      status: "final",
      gameCard: {
        ...game.gameCard,
        status: "final",
        calledFinalBy: uid,
        calledFinalAt: Date.now(),
      },
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return { status: "final" };
});
