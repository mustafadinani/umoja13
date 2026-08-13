import type { CheckInStatus } from "./team.js";

/** Pre-filled reasons an admin can attach to an internal check-in note — "other" pairs with a free-text field for anything not covered here. */
export const CHECKIN_NOTE_REASONS = [
  "ID doesn't clearly match selfie",
  "Photo quality too poor to verify",
  "Suspected duplicate check-in",
  "Age/DOB discrepancy",
  "Missing guardian consent",
  "Waiting on additional documentation",
  "Escalated by volunteer at gate",
  "Other",
] as const;

export type CheckInNoteReason = (typeof CHECKIN_NOTE_REASONS)[number];

/** An internal, staff-only note logged against a check-in — never shown to the player. */
export interface CheckInNote {
  id: string;
  authorUid: string;
  authorName: string;
  reason: CheckInNoteReason;
  /** Only populated when reason === "Other". */
  reasonOther?: string;
  text: string;
  createdAt: number;
}

/**
 * One check-in per player per category they play in (a player in 2
 * categories checks in twice, each producing its own pass).
 */
export interface CheckIn {
  id: string;
  // The account's Firebase Auth uid. Kept as the real uid (shared across
  // every sibling on one family account) because Firestore rules compare
  // this to request.auth.uid for read/write permission — never repurpose
  // it as a per-child identifier. Use playerKey for that.
  userId: string;
  /**
   * Unique per registered child (see RosterEntry.playerKey) — the actual
   * disambiguator this doc's id is built from. Optional only on check-ins
   * written before this field existed; every new check-in always sets it.
   */
  playerKey?: string;
  teamId: string;
  categoryId: string;
  status: CheckInStatus;
  selfieUrl: string;
  govIdUrl: string;
  submittedAt: number;
  attempt: number;
  reviewedBy?: string; // admin uid, once escalated or manually approved/rejected
  reviewedAt?: number;
  rejectionReason?: string;
  /**
   * Admin override of the default photo precedence (an approved selfie wins
   * over the registration photo, else the registration photo shows) — set
   * from the check-in review screen when the registration photo is clearer
   * than the selfie or vice versa. Undefined uses the default precedence.
   */
  cardPhotoOverride?: "selfie" | "registration";
  /** Running, internal-only record of admin notes on this check-in — never rendered to the player-facing CheckInCard. */
  internalNotes?: CheckInNote[];
  /** Recorded before any selfie/ID capture. */
  consent: CheckInConsent;
  /**
   * Only asked (and only meaningful) for PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS
   * (currently Girls 14 & Under, Women's Open) — whether this player would
   * like their team's games scheduled on the private field. Undefined for
   * every other category, since the question is never shown.
   */
  privateFieldPreference?: boolean;
  /** Both optional, offered as an extra step at check-in — never required, never asked of a category more than once per player. */
  lineOfWork?: string;
  currentEmployer?: string;
  /**
   * Set when staff approved this check-in directly (adminManualCheckIn) for
   * a player who never actually submitted a selfie/ID themselves — e.g. the
   * check-in flow was blocked for them (no camera access, a data bug) but
   * staff have confirmed who they are in person. selfieUrl/govIdUrl are
   * blank in this case; the card falls back to the registration photo.
   * Never set by the player's own submission.
   */
  manualOverride?: boolean;
}

export interface CheckInConsent {
  acceptedBy: "self" | "guardian";
  /** Required (and only meaningful) when acceptedBy === "guardian". */
  guardianName: string | null;
  acceptedAt: number;
  /** Lets us tell which version of the consent copy someone agreed to, if the policy text changes later. */
  policyVersion: string;
}

export interface TournamentPass {
  checkInId: string;
  // Real account uid — TournamentPass's read rule compares this to
  // request.auth.uid, so it must stay the actual uid, not a per-child key.
  userId: string;
  /** Unique per registered child — see RosterEntry.playerKey. */
  playerKey?: string;
  teamId: string;
  categoryId: string;
  status: CheckInStatus;
  /** Only populated once status === "approved"; blank + "PENDING" otherwise. */
  qrPayload?: string;
  passId?: string;
  selfieUrl: string;
}

/**
 * PII-free mirror of one player's check-in status (and now jersey number)
 * — the only check-in-adjacent data captains/referees/fans ever see on a
 * roster; the checkIns doc itself (gov ID, DOB, selfie tied to identity
 * docs) stays restricted to the player and staff.
 *
 * Unlike CheckIn.userId, this doc's `userId` field actually holds each
 * player's playerKey (unique per child), not the shared account uid — this
 * collection has no Firestore-rule dependency on it being a real uid
 * (writes are Admin-SDK-only, reads are public), so it's free to carry the
 * per-child identity that check-in/jersey-number lookups actually need.
 */
export interface RosterCheckIn {
  id: string;
  teamId: string;
  userId: string;
  categoryId: string;
  status: CheckInStatus;
  selfieUrl?: string;
  /** Mirrors CheckIn.cardPhotoOverride — see there for what it means. */
  cardPhotoOverride?: "selfie" | "registration";
  /**
   * Set by the player at check-in (optional) or by their captain/manager
   * any time before TOURNAMENT_START_AT — locked (can only be set once,
   * never changed) after that, from either side, once a number is on file.
   */
  jerseyNumber?: number;
  /** Mirrored from the checkIn doc if the player chose to share them — optional, never required. */
  lineOfWork?: string;
  currentEmployer?: string;
  /**
   * Set by a coach/manager (or staff) via assignTeamOfficial — independent of
   * the team's real registration captain (captainProfileId). Both feed
   * RosterEntry.isCaptain (see registeredPlayerToRosterEntry); this one is
   * additive, so a team can have the real captain plus one or more
   * coach-appointed co-captains at once.
   */
  appointedCaptain?: boolean;
  /** Set by staff via setSwagPickedUp when this player picks up their tournament swag — no lock, no conflict, just a checkbox at the swag table. */
  swagPickedUp?: boolean;
  updatedAt: number;
}

/** Doc id for a player's rosterCheckIns overlay — same key everywhere it's read or written. Pass a playerKey (see playerKeyFor), never the bare account uid. */
export function rosterCheckInIdFor(teamId: string, playerKey: string, categoryId: string): string {
  return `${teamId}_${playerKey}_${categoryId}`;
}

/**
 * The per-child disambiguator: an Outreach profileId when known (always
 * unique per registered child, once populated — see PlayerMembership /
 * RosterEntry.playerKey), else the shared account uid as a fallback for
 * accounts that predate/lack it (a solo child on the account, or a seed/test
 * user) — in that case it's equivalent to today's behavior.
 */
export function playerKeyFor(uid: string, profileId?: string): string {
  return profileId?.trim() || uid;
}

/** Doc id for a player's own check-in — keyed by playerKey (never the bare account uid), so two siblings sharing one parent account never collide onto the same check-in. */
export function checkInIdFor(playerKey: string, teamId: string, categoryId: string): string {
  return `${playerKey}_${teamId}_${categoryId}`;
}

/**
 * The one check-in status vocabulary shown anywhere in the app, player- or
 * staff-facing — four distinct states, never collapsed into each other:
 * PENDING CHECK-IN (never submitted), PENDING REVIEW (submitted, staff
 * hasn't decided), VERIFIED (approved), DECLINED (staff sent it back —
 * the player needs to fix something and resubmit). Every decision in this
 * lifecycle is a human one; nothing here is automated.
 */
export function checkInStatusLabel(status: CheckInStatus | undefined): string {
  switch (status) {
    case "approved":
      return "Verified";
    case "admin_review":
    case "pending_review": // legacy value, no longer produced
      return "Pending review";
    case "rejected":
      return "Declined";
    case "not_started":
    default:
      return "Pending check-in";
  }
}

/**
 * The one color vocabulary for a check-in status, shared by every surface
 * that shows it (roster rows, the player card, the Tournament Pass) — each
 * of the four states above gets its own tone, including "Declined" now
 * getting its own (danger/red) tone rather than sharing "Pending check-in"'s
 * muted one, so a decline is never visually indistinguishable from someone
 * who simply hasn't checked in yet.
 */
export type CheckInStatusTone = "success" | "warning" | "muted" | "danger";

export function checkInStatusTone(status: CheckInStatus | undefined): CheckInStatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "admin_review":
    case "pending_review":
      return "warning";
    case "rejected":
      return "danger";
    case "not_started":
    default:
      return "muted";
  }
}
