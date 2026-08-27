import { View, Text } from "react-native";
import type { Announcement } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal } from "./ui";
import { LinkifiedText } from "./LinkifiedText";

/** Shared by Home's teaser and the merged inbox screen — one place that renders a full announcement. */
export function AnnouncementDetailModal({ announcement, onClose }: { announcement: Announcement | null; onClose: () => void }) {
  return (
    <Modal visible={!!announcement} onClose={onClose}>
      {announcement && (
        <View>
          <Text style={{ fontWeight: "800", fontSize: 19 }}>{announcement.title}</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 12, marginVertical: 8 }}>
            {new Date(announcement.postedAt).toLocaleString()}
            {announcement.postedByName ? ` · ${announcement.postedByName}` : ""}
          </Text>
          <LinkifiedText text={announcement.body} style={{ fontSize: 14.5, lineHeight: 21 }} />
        </View>
      )}
    </Modal>
  );
}
