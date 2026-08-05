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
