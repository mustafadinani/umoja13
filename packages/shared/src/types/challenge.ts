/**
 * Admin-thrown "challenge questions" during the Hunt — distinct from the
 * pre-loaded 45-mission catalog (HuntMission): these are created on the fly
 * throughout the weekend, can be time-windowed (starts/deadline), and offer
 * early-bird bonus points ranked by submission time (not review time) —
 * an entry still has to be approved to actually collect its bonus.
 */
export type ChallengeAnswerType = "photo_or_video" | "photo_only" | "video_only";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  answerType: ChallengeAnswerType;
  startsAt?: number;
  deadline?: number;
  /** Bonus points for the Nth-earliest *submission* (index 0 = 1st place), independent of when it's reviewed. */
  earlyBirdBonuses: number[];
  createdAt: number;
  createdBy: string; // admin/commissioner uid
}

export type ChallengeSubmissionStatus = "pending" | "approved" | "rejected";

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  crewId: string;
  submittedBy: string; // uid
  submittedByName: string;
  mediaType: "photo" | "video";
  mediaUrl: string;
  status: ChallengeSubmissionStatus;
  /** This submission's 0-indexed rank by createdAt among all of this challenge's submissions — computed at review time, but reflects submission order, not approval order. */
  submissionRank?: number;
  bonusPoints?: number;
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
}
