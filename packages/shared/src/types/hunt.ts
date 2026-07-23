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
  createdAt: number;
}
