/**
 * One-way team channel: staff broadcast to a specific team's roster, and any
 * roster member (or staff) can reply back — same "sender-tagged message
 * array" shape as Incident.thread, but scoped to a team instead of a single
 * complaint. Created lazily by sendTeamMessage on first message.
 */
export interface TeamChannelMessage {
  id: string;
  from: "admin" | "team";
  authorUid: string;
  authorName: string;
  text: string;
  /** Optional photo/video attachment, uploaded to Storage client-side before this message is sent. */
  mediaUrl?: string;
  mediaType?: "photo" | "video";
  createdAt: number;
}

export interface TeamChannel {
  id: string; // == teamId
  teamId: string;
  messages: TeamChannelMessage[];
  updatedAt: number;
  /** uid -> ms timestamp each reader last opened this channel, for unread badges. */
  lastReadBy?: Record<string, number>;
}
