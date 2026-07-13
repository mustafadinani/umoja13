import { useEffect } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMyNotifications } from "../hooks/useData";
import { Card } from "../components/ui";

export function NotificationsScreen() {
  const { user } = useAuth();
  const { data: notifications } = useMyNotifications(user?.uid);

  useEffect(() => {
    notifications.filter((n) => !n.read).forEach((n) => {
      updateDoc(doc(db, COLLECTIONS.notifications, n.id), { read: true });
    });
  }, [notifications]);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.color.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={notifications}
      keyExtractor={(n) => n.id}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 8 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </Card>
      )}
      ListEmptyComponent={<Text style={{ color: theme.color.textMuted, textAlign: "center", marginTop: 40 }}>Nothing new.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", fontSize: 13.5 },
  body: { color: theme.color.textMuted, fontSize: 12.5, marginTop: 2 },
});
