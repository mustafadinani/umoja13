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
  createdAt: number;
}

export interface TeamChannel {
  id: string; // == teamId
  teamId: string;
  messages: TeamChannelMessage[];
  updatedAt: number;
}
