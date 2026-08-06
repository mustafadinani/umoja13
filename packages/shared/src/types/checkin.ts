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
  userId: string;
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
  userId: string;
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
 */
export interface RosterCheckIn {
  id: string;
  teamId: string;
  userId: string;
  categoryId: string;
  status: CheckInStatus;
  selfieUrl?: string;
  /**
   * Set by the player at check-in (optional) or by their captain/manager
   * any time before TOURNAMENT_START_AT — locked (can only be set once,
   * never changed) after that, from either side, once a number is on file.
   */
  jerseyNumber?: number;
  /** Mirrored from the checkIn doc if the player chose to share them — optional, never required. */
  lineOfWork?: string;
  currentEmployer?: string;
  updatedAt: number;
}

/** Doc id for a player's rosterCheckIns overlay — same key everywhere it's read or written. */
export function rosterCheckInIdFor(teamId: string, userId: string, categoryId: string): string {
  return `${teamId}_${userId}_${categoryId}`;
}

/**
 * The one check-in status vocabulary shown anywhere in the app, player- or
 * staff-facing: submissions start/land back on PENDING (not yet submitted,
 * or sent back after a decline — either way the player needs to check in),
 * move to ADMIN REVIEW once submitted, then a staff decision either marks
 * them VERIFIED or reverts them to PENDING for a resubmit. There is no
 * automated step in this lifecycle — every decision is a human one.
 */
export function checkInStatusLabel(status: CheckInStatus | undefined): string {
  switch (status) {
    case "approved":
      return "Verified";
    case "admin_review":
    case "pending_review": // legacy value, no longer produced
      return "Admin Review";
    case "rejected":
    case "not_started":
    default:
      return "Pending";
  }
}

/**
 * The one color vocabulary for a check-in status, shared by every surface
 * that shows it (roster rows, the player card, the Tournament Pass) so
 * "Verified" is always the same green and "Pending" is never alarmingly
 * red on a page that isn't asking anyone to act on it right now — unlike
 * the referee gate-check screen, which deliberately uses red for "NOT
 * VERIFIED" since it's blocking that player from playing.
 */
export type CheckInStatusTone = "success" | "warning" | "muted";

export function checkInStatusTone(status: CheckInStatus | undefined): CheckInStatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "admin_review":
    case "pending_review":
      return "warning";
    case "rejected":
    case "not_started":
    default:
      return "muted";
  }
}
