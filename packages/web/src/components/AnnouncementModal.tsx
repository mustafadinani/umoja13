import type { Announcement } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal } from "./ui";

export function AnnouncementModal({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>{announcement.title}</div>
      <div style={{ fontSize: 12.5, color: theme.color.textMuted, margin: "4px 0 14px" }}>
        {new Date(announcement.postedAt).toLocaleString()}
        {announcement.postedByName ? ` · ${announcement.postedByName}` : ""}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.6 }}>{announcement.body}</div>
    </Modal>
  );
}
