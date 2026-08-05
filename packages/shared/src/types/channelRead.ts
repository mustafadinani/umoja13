/**
 * Shared "has this channel been read" check for unread badges (nav bell,
 * Pods link, per-tab dots) — used identically for UserChannel, TeamChannel,
 * RoleChannel, and PodChannel, whose messages all carry an `authorUid` and
 * `createdAt`. A channel is unread if it contains any message from someone
 * other than the viewer, posted after the viewer's own last-read stamp.
 */
export interface ReadableChannelMessage {
  authorUid: string;
  createdAt: number;
}

export function channelHasUnread(
  messages: ReadableChannelMessage[] | undefined,
  lastReadBy: Record<string, number> | undefined,
  uid: string | undefined
): boolean {
  if (!uid || !messages || messages.length === 0) return false;
  const lastReadAt = lastReadBy?.[uid] ?? 0;
  return messages.some((m) => m.authorUid !== uid && m.createdAt > lastReadAt);
}
