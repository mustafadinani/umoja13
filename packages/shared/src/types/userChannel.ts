/**
 * General "message the organizers" channel: any signed-in user can message
 * staff from their own profile, and staff can reply — same one-way-broadcast
 * -plus-reply pattern as TeamChannel/RoleChannel, but scoped to a single
 * user rather than a team roster or role, since not every user is on a team
 * or holds a role like volunteer/referee.
 *
 * Also doubles as the "Ask Umoja" AI chat transcript — `from: "ai"` turns
 * are written by the askUmojaChannel callable, live in this same array so
 * staff see the full back-and-forth in one place, and are never routed
 * through notifyUsers (unlike admin/user turns).
 */
export interface UserChannelMessage {
  id: string;
  from: "admin" | "user" | "ai";
  authorUid: string;
  authorName: string;
  text: string;
  /** Optional photo/video attachment, uploaded to Storage client-side before this message is sent. Never set on an "ai" turn. */
  mediaUrl?: string;
  mediaType?: "photo" | "video";
  createdAt: number;
}

/** Sentinel author identity for AI-authored turns — never a real Firebase uid. */
export const AI_AUTHOR_UID = "ask-umoja-ai";
export const AI_AUTHOR_NAME = "Ask Umoja";

export interface UserChannel {
  id: string; // == the user's uid
  userId: string;
  messages: UserChannelMessage[];
  updatedAt: number;
  /** uid -> ms timestamp each reader last opened this channel, for unread badges. */
  lastReadBy?: Record<string, number>;
}
