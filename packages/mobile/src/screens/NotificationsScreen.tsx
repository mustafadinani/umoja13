import { useEffect, useState } from "react";
import { Text, FlatList, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { doc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, buildInbox, type Announcement } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useAnnouncements, useMyNotifications } from "../hooks/useData";
import { Card } from "../components/ui";
import { AnnouncementDetailModal } from "../components/AnnouncementDetailModal";

/**
 * The bell's inbox — a single time-sorted feed merging personal
 * Notifications with public Announcements, tagged so it's obvious which is
 * which. Announcements stay their own collection (Home still needs to show
 * them to signed-out visitors) but from here on they're one list, not two
 * tabs with no explained relationship.
 */
export function NotificationsScreen() {
  const { user } = useAuth();
  const { data: notifications } = useMyNotifications(user?.uid);
  const { data: announcements } = useAnnouncements();
  const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
  const inbox = buildInbox(notifications, announcements);
  const announcementById = new Map(announcements.map((a: Announcement) => [a.id, a]));

  useEffect(() => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, COLLECTIONS.notifications, n.id), { read: true }));
    batch.commit().catch(() => {});
  }, [notifications]);

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: theme.color.bg }}
        contentContainerStyle={{ padding: 16 }}
        data={inbox}
        keyExtractor={(e) => `${e.kind}-${e.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            disabled={item.kind !== "announcement"}
            onPress={() => setOpenAnnouncementId(item.id)}
            activeOpacity={0.8}
          >
            <Card style={{ marginBottom: 8 }}>
              {item.kind === "announcement" && <Text style={styles.tag}>📣 ANNOUNCEMENT</Text>}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body} numberOfLines={item.kind === "announcement" ? 2 : undefined}>{item.body}</Text>
              {item.kind === "announcement" && <Text style={styles.readMore}>Read more</Text>}
              {item.kind === "notification" && item.link && (
                <TouchableOpacity onPress={() => Linking.openURL(item.link!)}>
                  <Text style={styles.readMore}>📎 View attachment</Text>
                </TouchableOpacity>
              )}
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ color: theme.color.textMuted, textAlign: "center", marginTop: 40 }}>Nothing new.</Text>}
      />
      <AnnouncementDetailModal
        announcement={openAnnouncementId ? announcementById.get(openAnnouncementId) ?? null : null}
        onClose={() => setOpenAnnouncementId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 10.5, fontWeight: "800", color: theme.color.purple, letterSpacing: 0.4, marginBottom: 4 },
  title: { fontWeight: "700", fontSize: 13.5 },
  body: { color: theme.color.textMuted, fontSize: 12.5, marginTop: 2 },
  readMore: { color: theme.color.blue, fontSize: 12, fontWeight: "600", marginTop: 6 },
});
