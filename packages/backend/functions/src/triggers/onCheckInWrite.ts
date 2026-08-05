import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { COLLECTIONS, type CheckIn } from "@umoja/shared";
import { FIRESTORE_DATABASE_ID } from "../util/admin.js";
import { syncRosterCheckInStatus } from "../util/roster.js";

/**
 * Mirrors every check-in write (the player's own initial submission into
 * "admin_review", same as any later admin decision) into `rosterCheckIns` —
 * so a roster's "Admin Review"/"Verified"/"Pending" status is always live,
 * not just updated on approve/reject. adminReviewCheckIn also calls
 * syncRosterCheckInStatus directly (for the same-transaction tournamentPass
 * write), but a client-side create (the player's own initial submission)
 * never goes through a callable, so this trigger is what catches that case.
 */
export const onCheckInWrite = onDocumentWritten(
  { document: `${COLLECTIONS.checkIns}/{checkInId}`, database: FIRESTORE_DATABASE_ID },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const checkIn = after.data() as CheckIn;
    await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, checkIn.categoryId, checkIn.status, checkIn.selfieUrl);
  }
);
