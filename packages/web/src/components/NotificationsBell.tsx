import { useState } from "react";
import { doc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, buildInbox, unreadCount } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useAnnouncements, useMyNotifications } from "../hooks/useData";
import { AnnouncementModal } from "./AnnouncementModal";

/**
 * The merged inbox — one time-sorted feed of personal Notifications and
 * public Announcements, tagged so it's obvious which is which. Only
 * Notifications drive the unread badge (an announcement is a bulletin, not
 * a message addressed to you) and only Notifications get marked read on
 * open — Announcements don't have a "read" concept, they're just posts.
 */
export function NotificationsBell() {
  const { user } = useAuth();
  const { data: notifications } = useMyNotifications(user?.uid);
  const { data: announcements } = useAnnouncements();
  const [open, setOpen] = useState(false);
  const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
  const inbox = buildInbox(notifications, announcements);
  const unread = unreadCount(inbox);
  const openAnnouncement = announcements.find((a) => a.id === openAnnouncementId) ?? null;

  if (!user) return null;

  async function markAllRead() {
    const unreadNotifs = notifications.filter((n) => !n.read);
    if (unreadNotifs.length === 0) return;
    const batch = writeBatch(db);
    unreadNotifs.forEach((n) => batch.update(doc(db, COLLECTIONS.notifications, n.id), { read: true }));
    await batch.commit();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void markAllRead();
        }}
        style={{ background: "none", border: "none", color: "#fff", fontSize: 18, position: "relative", padding: 6 }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: theme.color.pink }} />
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "110%", width: "min(320px, calc(100vw - 24px))", background: "#fff", borderRadius: theme.radius.md, boxShadow: "0 10px 30px rgba(0,0,0,.2)", color: theme.color.text, zIndex: 60, maxHeight: 380, overflowY: "auto" }}>
          {inbox.length === 0 && <div style={{ padding: 16, fontSize: 13.5, color: theme.color.textMuted }}>Nothing new.</div>}
          {inbox.map((e) => (
            <div
              key={`${e.kind}-${e.id}`}
              onClick={() => e.kind === "announcement" && setOpenAnnouncementId(e.id)}
              style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.color.border}`, cursor: e.kind === "announcement" ? "pointer" : "default" }}
            >
              {e.kind === "announcement" && (
                <div style={{ fontSize: 10.5, fontWeight: 800, color: theme.color.purple, letterSpacing: 0.4, marginBottom: 2 }}>📣 ANNOUNCEMENT</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.title}</div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{e.body}</div>
            </div>
          ))}
        </div>
      )}
      {openAnnouncement && <AnnouncementModal announcement={openAnnouncement} onClose={() => setOpenAnnouncementId(null)} />}
    </div>
  );
}
