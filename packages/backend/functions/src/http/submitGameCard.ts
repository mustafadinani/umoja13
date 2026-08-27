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
  if (!(game.refereeUids ?? []).includes(uid)) throw new HttpsError("permission-denied", "Not your assigned game.");
  if (!game.gateCheck?.completedAt) {
    throw new HttpsError("failed-precondition", "Complete the gate check before submitting the game card.");
  }
  if (!game.motmUserId) {
    throw new HttpsError("failed-precondition", "Pick Player of the Game before submitting the game card.");
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

interface ReopenGameCardRequest {
  gameId: string;
}

/**
 * The referee's explicit "make changes" action — the ONLY way gameCard.status
 * can move back to "not_submitted" once submitted, since firestore.rules never
 * let a referee write the `gameCard` field directly (only this and
 * submitGameCard/callItFinal, all Admin SDK, can). This exists because the
 * referee console's editable fields (gateCheck, events, motmUserId,
 * homeScore, awayScore) used to stay writable at any time regardless of card
 * status — a referee could quietly undo goals/cards/MOTM/check-ins after
 * submitting, with no warning and no record. Now those fields are rules-gated
 * to only be writable while gameCard.status is "not_submitted" (see
 * firestore.rules), so reopening is the one deliberate, visible gate back
 * into edit mode — and it's blocked entirely once the commissioner has
 * already called the game final, per the explicit ask that nothing be
 * changeable past that point.
 */
export const reopenGameCard = onCall<ReopenGameCardRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { gameId } = request.data;
  const ref = db.collection(COLLECTIONS.games).doc(gameId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found.");
  const game = snap.data() as Game;

  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = userSnap.data()?.roles ?? [];
  const isStaff = roles.includes("admin") || roles.includes("commissioner");
  if (!isStaff && !(game.refereeUids ?? []).includes(uid)) {
    throw new HttpsError("permission-denied", "Not your assigned game.");
  }

  if (game.gameCard?.status === "final") {
    throw new HttpsError("failed-precondition", "This game has already been finalized by the commissioner — nothing can be changed.");
  }
  if (game.gameCard?.status !== "awaiting_commissioner") {
    throw new HttpsError("failed-precondition", "No submitted game card to reopen.");
  }

  await ref.set(
    { gameCard: { ...game.gameCard, status: "not_submitted" }, updatedAt: Date.now() },
    { merge: true }
  );

  return { status: "not_submitted" };
});
