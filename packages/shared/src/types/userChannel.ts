/**
 * General "message the organizers" channel: any signed-in user can message
 * staff from their own profile, and staff can reply — same one-way-broadcast
 * -plus-reply pattern as TeamChannel/RoleChannel, but scoped to a single
 * user rather than a team roster or role, since not every user is on a team
 * or holds a role like volunteer/referee.
 */
export interface UserChannelMessage {
  id: string;
  from: "admin" | "user";
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: number;
}

export interface UserChannel {
  id: string; // == the user's uid
  userId: string;
  messages: UserChannelMessage[];
  updatedAt: number;
}
