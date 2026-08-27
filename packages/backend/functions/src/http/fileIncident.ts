import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type IncidentSource, type ComplaintType } from "@umoja/shared";
import { db } from "../util/admin.js";
import { nextCaseNumber } from "../util/counters.js";
import { isCaptainOrCoachManager } from "../util/teamRoles.js";

interface FileIncidentRequest {
  source: IncidentSource;
  filedByName: string;
  filedByRole: string;
  complaintType?: ComplaintType;
  gameId?: string;
  playerKey?: string;
  playerName?: string;
  playerTeamId?: string;
  playerCategoryId?: string;
  text: string;
}

/**
 * Validates the type-specific fields a filer must provide, mirroring the
 * three-way choice ("Player eligibility" / "Game incident" / "Other") the
 * filing UI presents before it ever gets here. Shared between fileIncident
 * and filePaidReport so the two entry points can't drift.
 */
function assertComplaintTypeFields(
  complaintType: ComplaintType | undefined,
  fields: { gameId?: string; playerKey?: string; playerName?: string }
) {
  if (complaintType === "ineligible_player" && (!fields.playerKey || !fields.playerName)) {
    throw new HttpsError("invalid-argument", "Please search for and select the player you're reporting.");
  }
  if (complaintType === "game_related" && !fields.gameId) {
    throw new HttpsError("invalid-argument", "Please select the game you're referring to.");
  }
}

/**
 * Creates an Incident with a server-assigned, collision-free case number.
 * Covers captain complaints, referee flags, forfeit notices, and fan
 * "still stuck" escalations — all land in the same commissioner inbox.
 */
export const fileIncident = onCall<FileIncidentRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { source, filedByName, filedByRole, complaintType, gameId, playerKey, playerName, playerTeamId, playerCategoryId, text } =
    request.data;
  if (!text || text.trim().length < 3) {
    throw new HttpsError("invalid-argument", "Please describe what happened (at least 3 characters).");
  }

  // Captain complaints (the $35 team-specific complaint) are restricted to a
  // team's real registration captain or an admin-designated coach/manager —
  // the UI only ever shows this button to that group; enforce it here too so
  // the callable can't be hit directly to file one as anyone else.
  if (source === "captain_complaint" && !(await isCaptainOrCoachManager(uid))) {
    throw new HttpsError("permission-denied", "Only a team's captain or coach/manager can file this complaint.");
  }
  if (source === "captain_complaint" && !complaintType) {
    throw new HttpsError("invalid-argument", "Please choose an issue type.");
  }
  assertComplaintTypeFields(complaintType, { gameId, playerKey, playerName });

  const prefix = source === "fan_message" ? "UQ" : "UG";
  const caseNumber = await nextCaseNumber(prefix);
  const now = Date.now();

  const ref = db.collection(COLLECTIONS.incidents).doc();
  const fee =
    source === "captain_complaint" || source === "fan_message"
      ? { amountCents: 3500, paid: false, refunded: false }
      : undefined;

  await ref.set({
    id: ref.id,
    caseNumber,
    source,
    filedByUid: uid,
    filedByName,
    filedByRole,
    complaintType: complaintType ?? null,
    gameId: complaintType === "game_related" ? gameId : null,
    playerKey: complaintType === "ineligible_player" ? playerKey : null,
    playerName: complaintType === "ineligible_player" ? playerName : null,
    playerTeamId: complaintType === "ineligible_player" ? (playerTeamId ?? null) : null,
    playerCategoryId: complaintType === "ineligible_player" ? (playerCategoryId ?? null) : null,
    text,
    status: "submitted",
    thread: [],
    fee: fee ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return { id: ref.id, caseNumber };
});
