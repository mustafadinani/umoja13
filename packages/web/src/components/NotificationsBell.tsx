import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMyNotifications } from "../hooks/useData";

export function NotificationsBell() {
  const { user } = useAuth();
  const { data: notifications } = useMyNotifications(user?.uid);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  if (!user) return null;

  async function markAllRead() {
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) => updateDoc(doc(db, COLLECTIONS.notifications, n.id), { read: true }))
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        style={{ background: "none", border: "none", color: "#fff", fontSize: 18, position: "relative", padding: 6 }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: theme.color.pink }} />
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "110%", width: 300, background: "#fff", borderRadius: theme.radius.md, boxShadow: "0 10px 30px rgba(0,0,0,.2)", color: theme.color.text, zIndex: 60, maxHeight: 360, overflowY: "auto" }}>
          {notifications.length === 0 && <div style={{ padding: 16, fontSize: 13.5, color: theme.color.textMuted }}>Nothing new.</div>}
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${theme.color.border}` }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
