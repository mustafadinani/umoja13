import type { Announcement, Notification } from "./moments.js";

/**
 * Notifications and Announcements stay two separate Firestore collections
 * (Announcements are public/always-readable — signed-out Home visitors need
 * them; Notifications are personal/per-uid) but the bell/inbox screen on
 * both platforms renders them as one time-sorted feed. `kind` is the only
 * thing that tells them apart once merged.
 */
export type InboxEntry =
  | { kind: "notification"; id: string; title: string; body: string; link?: string; read: boolean; createdAt: number }
  | { kind: "announcement"; id: string; title: string; body: string; createdAt: number; postedByName?: string };

export function buildInbox(notifications: Notification[], announcements: Announcement[]): InboxEntry[] {
  const fromNotifications: InboxEntry[] = notifications.map((n) => ({
    kind: "notification",
    id: n.id,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt,
  }));
  const fromAnnouncements: InboxEntry[] = announcements.map((a) => ({
    kind: "announcement",
    id: a.id,
    title: a.title,
    body: a.body,
    createdAt: a.postedAt,
    postedByName: a.postedByName,
  }));
  return [...fromNotifications, ...fromAnnouncements].sort((a, b) => b.createdAt - a.createdAt);
}

/** Only personal notifications drive the unread badge — an announcement is a bulletin, not a message addressed to you, so it never reddens the bell. */
export function unreadCount(entries: InboxEntry[]): number {
  return entries.filter((e) => e.kind === "notification" && !e.read).length;
}
