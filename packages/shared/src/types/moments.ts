export type MomentSource = "game" | "hunt" | "community";
export type MomentMediaType = "photo" | "video";

export interface Moment {
  id: string;
  mediaType: MomentMediaType;
  mediaUrl: string;
  caption: string;
  /** Optional freeform note from the poster, shown under the caption. */
  comment?: string;
  postedBy: string; // uid
  postedByName: string;
  teamTagId?: string;
  source: MomentSource;
  gameId?: string;
  huntSubmissionId?: string;
  likeUids: string[];
  /** Youth categories always require review before a moment goes live. */
  moderationStatus: "pending" | "approved" | "rejected";
  createdAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  postedAt: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  tagline: string;
  story: string;
  sponsoredTeamIds: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: number;
}
