import { useEffect, useState } from "react";
import { doc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, buildInbox, unreadCount } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useAnnouncements, useMyNotifications } from "../hooks/useData";
import { AnnouncementModal } from "./AnnouncementModal";
import { disableWebPush, enableWebPush, isWebPushSupported } from "../lib/webPush";

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
  const [webPushSubscribed, setWebPushSubscribed] = useState(false);
  const [webPushBusy, setWebPushBusy] = useState(false);
  const [webPushError, setWebPushError] = useState<string | null>(null);
  const inbox = buildInbox(notifications, announcements);
  const unread = unreadCount(inbox);
  const openAnnouncement = announcements.find((a) => a.id === openAnnouncementId) ?? null;

  // Reflects the browser's own subscription state (not just Notification
  // permission — a user can grant permission once, later hit "turn off"
  // below, and keep permission itself sitting at "granted") so the toggle
  // never lies about whether this browser is actually enrolled.
  useEffect(() => {
    if (!isWebPushSupported()) return;
    let cancelled = false;
    navigator.serviceWorker.getRegistration("/sw-push.js").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) setWebPushSubscribed(!!subscription);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  async function toggleWebPush() {
    setWebPushBusy(true);
    setWebPushError(null);
    try {
      if (webPushSubscribed) {
        await disableWebPush();
        setWebPushSubscribed(false);
      } else {
        const ok = await enableWebPush();
        if (!ok) {
          setWebPushError(
            Notification.permission === "denied"
              ? "Notifications are blocked for this site — enable them in your browser's site settings."
              : "Couldn't enable notifications."
          );
        }
        setWebPushSubscribed(ok);
      }
    } catch (e) {
      setWebPushError(e instanceof Error ? e.message : "Couldn't update notification settings.");
    } finally {
      setWebPushBusy(false);
    }
  }

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
          {isWebPushSupported() && (
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.color.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>
                {webPushSubscribed ? "Browser notifications are on" : "Get notified in this browser"}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleWebPush();
                }}
                disabled={webPushBusy}
                style={{
                  background: webPushSubscribed ? "none" : theme.color.purple,
                  color: webPushSubscribed ? theme.color.textMuted : "#fff",
                  border: webPushSubscribed ? `1px solid ${theme.color.border}` : "none",
                  borderRadius: theme.radius.pill,
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  opacity: webPushBusy ? 0.6 : 1,
                }}
              >
                {webPushBusy ? "…" : webPushSubscribed ? "Turn off" : "Enable"}
              </button>
            </div>
          )}
          {webPushError && (
            <div style={{ padding: "8px 14px", fontSize: 11.5, color: theme.color.danger, borderBottom: `1px solid ${theme.color.border}` }}>
              {webPushError}
            </div>
          )}
          {inbox.length === 0 && <div style={{ padding: 16, fontSize: 13.5, color: theme.color.textMuted }}>Nothing new.</div>}
          {inbox.map((e) => (
            <div
              key={`${e.kind}-${e.id}`}
              onClick={() => {
                if (e.kind !== "announcement") return;
                setOpenAnnouncementId(e.id);
                setOpen(false);
              }}
              style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.color.border}`, cursor: e.kind === "announcement" ? "pointer" : "default" }}
            >
              {e.kind === "announcement" && (
                <div style={{ fontSize: 10.5, fontWeight: 800, color: theme.color.purple, letterSpacing: 0.4, marginBottom: 2 }}>📣 ANNOUNCEMENT</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.title}</div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{e.body}</div>
              {e.kind === "notification" && e.link && (
                <a
                  href={e.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(ev) => ev.stopPropagation()}
                  style={{ display: "inline-block", marginTop: 6, fontSize: 12, fontWeight: 700, color: theme.color.purple }}
                >
                  📎 View attachment
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      {openAnnouncement && <AnnouncementModal announcement={openAnnouncement} onClose={() => setOpenAnnouncementId(null)} />}
    </div>
  );
}
