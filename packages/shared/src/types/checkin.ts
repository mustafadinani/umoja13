import type { CheckInStatus } from "./team.js";

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
  aiVerification?: {
    faceMatch: boolean;
    faceMatchConfidence: number;
    dobExtracted: string | null;
    ageEligible: boolean;
    reasoning: string;
    checkedAt: number;
  };
  reviewedBy?: string; // admin uid, once escalated or manually approved/rejected
  reviewedAt?: number;
  rejectionReason?: string;
  /** Recorded before any selfie/ID capture — required for verifyCheckIn to run at all. */
  consent: CheckInConsent;
  /** True if the player opted out of AI comparison; routes straight to admin_review instead of calling verifyCheckIn. */
  aiBypassRequested?: boolean;
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
  /** Only populated once status === "approved"; blank + "PENDING REVIEW" otherwise. */
  qrPayload?: string;
  passId?: string;
  selfieUrl: string;
}
