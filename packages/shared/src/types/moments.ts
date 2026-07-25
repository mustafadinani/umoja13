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
  /** Optional team tags — shows this moment on each tagged team's page. */
  teamTagIds?: string[];
  /** Optional player tags — shows this moment on each tagged player's Player Card. */
  playerTagUids?: string[];
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

export type SponsorTier = "legacy_builder" | "impact_partner" | "community_supporter" | "custom";

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  tagline: string;
  story: string;
  sponsoredTeamIds: string[];
  tier: SponsorTier;
  /** Manual sort position within a tier (lower shows first). */
  order: number;
  websiteUrl?: string;
  /** Staff can hide a sponsor without deleting it (e.g. a deal that lapsed). */
  visible: boolean;
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
