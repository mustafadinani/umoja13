/**
 * One-way role channel: staff broadcast to everyone holding a given role
 * (volunteers, referees), and any member with that role can reply back.
 * Same sender-tagged message-array shape as TeamChannel, but scoped by role
 * across the whole tournament instead of by a single team's roster —
 * volunteers/referees aren't naturally split into many groups the way teams
 * are, so there's just one channel per role.
 */
export type ChannelRole = "volunteer" | "referee";

export interface RoleChannelMessage {
  id: string;
  from: "admin" | "member";
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: number;
}

export interface RoleChannel {
  id: string; // == role
  role: ChannelRole;
  messages: RoleChannelMessage[];
  updatedAt: number;
}
