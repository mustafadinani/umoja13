import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { COLLECTIONS, type Team } from "@umoja/shared";
import { FIRESTORE_DATABASE_ID } from "../util/admin.js";

/**
 * Keeps Team.rosterUids (a plain uid list) in sync with Team.roster (an
 * array of RosterEntry objects) whenever roster changes — Firestore rules
 * can't filter roster's objects by userId, so teamChannels reads check
 * membership against this mirrored list instead.
 */
export const onTeamWrite = onDocumentWritten(
  { document: `${COLLECTIONS.teams}/{teamId}`, database: FIRESTORE_DATABASE_ID },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const team = after.data() as Team;
    const rosterUids = [...new Set((team.roster ?? []).map((r) => r.userId))].sort();
    const existing = [...(team.rosterUids ?? [])].sort();
    if (JSON.stringify(rosterUids) === JSON.stringify(existing)) return;

    await after.ref.set({ rosterUids }, { merge: true });
  }
);
