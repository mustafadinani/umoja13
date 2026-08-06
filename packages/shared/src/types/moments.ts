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
  /** Optional byline for the merged inbox feed — absent on older docs, which still render fine without one. */
  postedByUid?: string;
  postedByName?: string;
}

export type SponsorTier = "legacy_builder" | "impact_partner" | "community_supporter" | "custom";

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  tagline: string;
  story: string;
  /** Optional longer write-up, distinct from the one-line tagline/story — shown if the sponsor wants more detail. */
  description?: string;
  sponsoredTeamIds: string[];
  tier: SponsorTier;
  /** Manual sort position within a tier (lower shows first). */
  order: number;
  websiteUrl?: string;
  instagramUrl?: string;
  /** Any other social media page (Facebook, TikTok, LinkedIn, etc.). */
  socialUrl?: string;
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
