/**
 * Shared "has this channel been read" check for unread badges (nav bell,
 * Pods link, per-tab dots) — used identically for UserChannel, TeamChannel,
 * RoleChannel, and PodChannel, whose messages all carry an `authorUid` and
 * `createdAt`. A channel is unread if it contains any message from someone
 * other than the viewer, posted after the viewer's own last-read stamp.
 *
 * `from` is optional because only UserChannelMessage has it — AI-authored
 * turns (`from: "ai"`) are excluded from this check entirely: they're an
 * automated reply to the viewer's own question, not a message from someone
 * else, so they must never badge the viewer's own channel as unread.
 */
export interface ReadableChannelMessage {
  authorUid: string;
  createdAt: number;
  from?: string;
}

export function channelHasUnread(
  messages: ReadableChannelMessage[] | undefined,
  lastReadBy: Record<string, number> | undefined,
  uid: string | undefined
): boolean {
  if (!uid || !messages || messages.length === 0) return false;
  const lastReadAt = lastReadBy?.[uid] ?? 0;
  return messages.some((m) => m.from !== "ai" && m.authorUid !== uid && m.createdAt > lastReadAt);
}
