import { useState } from "react";
import { channelHasUnread } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useUserChannel } from "../hooks/useData";
import { markChannelRead } from "../lib/callables";
import { Modal } from "./ui";
import { UserChannelPanel } from "./UserChannelPanel";

export function MessagesBell() {
  const { user } = useAuth();
  const { data: channel } = useUserChannel(user?.uid);
  const [open, setOpen] = useState(false);
  const unread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);

  if (!user) return null;

  function toggle() {
    setOpen((v) => !v);
    if (!open) void markChannelRead({ kind: "user", id: user!.uid });
  }

  return (
    <>
      <button onClick={toggle} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, position: "relative", padding: 6 }}>
        💬
        {unread && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: theme.color.pink }} />
        )}
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} width={420}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 12 }}>MESSAGE THE ORGANIZERS</div>
          <UserChannelPanel uid={user.uid} />
        </Modal>
      )}
    </>
  );
}
