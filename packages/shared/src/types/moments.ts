export type MomentSource = "game" | "hunt" | "community";
/** "embed" is staff-only (see parseMomentEmbedUrl) — a pasted YouTube/Vimeo link instead of an uploaded file. */
export type MomentMediaType = "photo" | "video" | "embed";
export type MomentEmbedPlatform = "youtube" | "vimeo";

export interface Moment {
  id: string;
  mediaType: MomentMediaType;
  /** For mediaType "embed", this is always the canonical player URL produced by parseMomentEmbedUrl (e.g. https://www.youtube.com/embed/<id>) — never the raw pasted link — so every render site can drop it straight into an iframe/WebView without re-parsing. */
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

export interface ParsedMomentEmbed {
  platform: MomentEmbedPlatform;
  videoId: string;
  /** Canonical player URL — what actually goes into the Moment's mediaUrl and into an iframe/WebView src. */
  embedUrl: string;
}

// Regex-only (no `URL` global) so this parses identically on web, mobile
// (Hermes has no built-in URL), and the backend. Deliberately narrow — this
// is also the shape the Firestore rule checks against, so loosening it here
// without loosening the rule (packages/backend/firestore.rules) breaks
// posting; loosening the rule without this allow-list turns the app's own
// iframe/WebView into an open embed of arbitrary pages.
const YOUTUBE_WATCH_RE = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{6,15})(?:&.*)?$/i;
const YOUTUBE_SHORT_RE = /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{6,15})(?:\?.*)?$/i;
const YOUTUBE_SHORTS_RE = /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{6,15})(?:\?.*)?$/i;
const YOUTUBE_EMBED_RE = /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{6,15})(?:\?.*)?$/i;
const VIMEO_RE = /^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?:[/?].*)?$/i;

/**
 * Recognizes a pasted YouTube/Vimeo URL (any of the common share/watch/embed
 * shapes) and normalizes it to the canonical player URL Moments always
 * stores. Returns null for anything else — including a syntactically valid
 * URL on an unsupported host — so the caller can show "only YouTube/Vimeo
 * links are supported" instead of silently accepting an arbitrary page.
 */
export function parseMomentEmbedUrl(raw: string): ParsedMomentEmbed | null {
  const trimmed = raw.trim();
  for (const re of [YOUTUBE_WATCH_RE, YOUTUBE_SHORT_RE, YOUTUBE_SHORTS_RE, YOUTUBE_EMBED_RE]) {
    const m = trimmed.match(re);
    if (m) return { platform: "youtube", videoId: m[1], embedUrl: `https://www.youtube.com/embed/${m[1]}` };
  }
  const vm = trimmed.match(VIMEO_RE);
  if (vm) return { platform: "vimeo", videoId: vm[1], embedUrl: `https://player.vimeo.com/video/${vm[1]}` };
  return null;
}

/** YouTube serves a predictable thumbnail per video ID — no API call needed. Vimeo has no equivalent, so callers fall back to a placeholder for that platform. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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
