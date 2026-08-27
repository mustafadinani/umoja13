import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { REGISTRATION_ROOT, REGISTRATION_YEAR, PLAYERS_REGISTERED, type RegisteredPlayer } from "@umoja/shared";
import { syncTeamRosterUidsFromRegistration } from "../util/roster.js";

/**
 * Keeps `teams/{teamId}.rosterUids` (the primary-db field the teamChannels
 * read rule and the send*Message/markChannelRead callables all trust) in
 * sync with the real, current roster whenever a registration player row
 * changes — a player added, reassigned to a different team, or removed.
 *
 * Listens on the `(default)` database (Umoja Outreach's registration data,
 * read-only from this app's side per util/admin.ts) but only ever WRITES to
 * this app's own `umoja13-app` database — never back to `(default)`.
 *
 * Resyncs both the old and new teamId on a reassignment so the player's
 * former team's channel access is revoked, not just the new team's granted.
 */
export const onPlayerRegisteredWrite = onDocumentWritten(
  { document: `${REGISTRATION_ROOT}/${REGISTRATION_YEAR}/${PLAYERS_REGISTERED}/{playerId}`, database: "(default)" },
  async (event) => {
    const before = event.data?.before?.exists ? (event.data.before.data() as RegisteredPlayer) : undefined;
    const after = event.data?.after?.exists ? (event.data.after.data() as RegisteredPlayer) : undefined;
    const teamIds = new Set(
      [before?.teamId, after?.teamId].filter((v): v is string => !!v?.trim())
    );
    await Promise.all([...teamIds].map((teamId) => syncTeamRosterUidsFromRegistration(teamId)));
  }
);
