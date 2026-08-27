import { TOURNAMENT_DAY_ISO_DATE } from "../constants/categories.js";

/** 7 real activity types per the 2026 Scavenger Hunt guide (not 6 as first assumed). */
export type HuntMissionType = "photo" | "video" | "trivia" | "gps" | "qr" | "text" | "mini_game";

/** Photo/Video/Text/Mini-game are reviewed by a facilitator; Trivia/GPS/QR auto-score. */
export function huntMissionIsAutoScored(type: HuntMissionType): boolean {
  return type === "trivia" || type === "gps" || type === "qr";
}

export interface HuntMission {
  id: string;
  type: HuntMissionType;
  title: string;
  subtitle: string;
  description: string;
  points: number; // 75-175 in the real 2026 mission set
  /** "open" = available all three days (the PDF's lettered A-O missions). */
  day: "1" | "2" | "3" | "open";
  /** Trivia only. */
  options?: string[];
  answerIndex?: number;
  /** GPS/QR only: geofence id or QR token expected to auto-score the check-in. */
  autoScoreToken?: string;
}

/**
 * Which mission day is "now," 0-3 — 0 means before Day 1 has opened (only
 * "open" missions should be visible). Reuses the same real calendar dates
 * (TOURNAMENT_DAY_ISO_DATE: Day 1 = Fri Aug 14, Day 2 = Sat Aug 15, Day 3 =
 * Sun Aug 16) and America/New_York convention as the tournament's own
 * Game.day, at each day's midnight boundary — a mission day never had an
 * absolute date of its own before this.
 */
export function currentHuntDayNumber(now: number): 0 | 1 | 2 | 3 {
  const day1 = new Date(`${TOURNAMENT_DAY_ISO_DATE.fri}T00:00:00-04:00`).getTime();
  const day2 = new Date(`${TOURNAMENT_DAY_ISO_DATE.sat}T00:00:00-04:00`).getTime();
  const day3 = new Date(`${TOURNAMENT_DAY_ISO_DATE.sun}T00:00:00-04:00`).getTime();
  if (now >= day3) return 3;
  if (now >= day2) return 2;
  if (now >= day1) return 1;
  return 0;
}

/**
 * Whether a mission should be visible to participants right now — "open"
 * missions always are; a dated one only once its own day has arrived.
 * Missions never disappear again once their day has passed (a crew that
 * hasn't finished Day 1's missions yet can still see and complete them on
 * Day 2) — only FUTURE days are hidden, per the reported bug ("show the
 * active day, hide anything in the future").
 */
export function isHuntMissionVisible(day: HuntMission["day"], now: number = Date.now()): boolean {
  if (day === "open") return true;
  return Number(day) <= currentHuntDayNumber(now);
}

export type CrewInviteStatus = "invited" | "accepted" | "declined";

export interface CrewMember {
  userId?: string; // set once the invite is matched/accepted to an account
  name: string;
  email: string;
  status: CrewInviteStatus;
  invitedAt: number;
}

export interface HuntCrew {
  id: string;
  name: string;
  leadUserId: string;
  members: CrewMember[]; // max 4 total including lead, unique account membership enforced
  /** Denormalized accepted-member uids (mirrors members[].userId where status='accepted', plus leadUserId) — lets Firestore rules check membership without array-of-maps lookups. */
  memberUids: string[];
  /** Denormalized lowercase emails of all invited/accepted members — lets an invitee find their pending invite via an array-contains query. */
  memberEmails: string[];
  locked: boolean; // true once the Hunt begins (Fri 9am) — no roster changes after
  points: number;
  missionsCompleted: string[]; // mission ids
  /** Challenge ids this crew has an approved submission for (separate from missionsCompleted). */
  challengesCompleted?: string[];
  createdAt: number;
}

export type HuntSubmissionStatus = "pending" | "approved" | "rejected";

/** Pre-filled reasons a facilitator can attach when declining a Hunt mission or Challenge submission — "Other" pairs with a free-text field for anything not covered here. Shown back to the crew so they know what to fix before resubmitting. */
export const HUNT_DECLINE_REASONS = [
  "Doesn't show the required location/subject",
  "Wrong mission/challenge — resubmitted to the wrong one",
  "Photo/video quality too poor to verify",
  "Answer is incorrect or incomplete",
  "Missing required crew members",
  "Duplicate of an already-approved submission",
  "Other",
] as const;

export type HuntDeclineReason = (typeof HUNT_DECLINE_REASONS)[number];

export interface HuntSubmission {
  id: string;
  crewId: string;
  missionId: string;
  submittedBy: string; // uid
  submittedByName: string;
  mediaType: "photo" | "video" | "text" | null;
  mediaUrl?: string;
  textAnswer?: string;
  status: HuntSubmissionStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  /** Only set when status === "rejected" — shown to the crew so they know what to fix. */
  rejectionReason?: string;
  createdAt: number;
}
