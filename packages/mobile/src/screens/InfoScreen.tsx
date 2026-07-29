import { View, Text, ScrollView, StyleSheet } from "react-native";
import { UMOJA_FAQ, THINGS_TO_DO, VENUE_LOGISTICS, VENUE, SPECIAL_EVENTS } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Card } from "../components/ui";

export function InfoScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text style={styles.sub}>{VENUE.name} · {VENUE.address} · {VENUE.dates}</Text>

      <Text style={styles.h2}>FAQ</Text>
      <View style={{ gap: 8, marginBottom: 24 }}>
        {UMOJA_FAQ.map((f) => (
          <Card key={f.q}>
            <Text style={{ fontWeight: "700", fontSize: 14, marginBottom: 4 }}>{f.q}</Text>
            <Text style={{ fontSize: 13, color: theme.color.textMuted }}>{f.a}</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.h2}>Special Events</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {SPECIAL_EVENTS.map((e) => (
          <View key={e.id} style={styles.eventChip}>
            <Text style={{ fontSize: 13 }}>
              <Text style={{ fontWeight: "700" }}>{e.label}</Text> — {e.day === "sun" ? "Sunday" : e.day}
              {"time" in e ? ` ${e.time}` : ""}, {e.field}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.h2}>Venue & Logistics</Text>
      <Card style={{ marginBottom: 24 }}>
        <Text style={styles.p}>{VENUE_LOGISTICS.fieldLayout}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Parking:</Text> {VENUE_LOGISTICS.parking}</Text>
        <Text style={styles.p}><Text style={styles.bold}>While you're there:</Text> {VENUE_LOGISTICS.onSitePark}</Text>
        <Text style={styles.p}><Text style={styles.bold}>Hours:</Text> {VENUE_LOGISTICS.hours}</Text>
        <Text style={[styles.p, { marginBottom: 0 }]}><Text style={styles.bold}>Venue phone:</Text> {VENUE_LOGISTICS.phone}</Text>
      </Card>

      <Text style={styles.h2}>Nearby Things To Do</Text>
      <View style={{ gap: 8 }}>
        {THINGS_TO_DO.map((t) => (
          <Card key={t.name}>
            <Text style={{ fontWeight: "700", fontSize: 14, marginBottom: 4 }}>{t.name}</Text>
            <Text style={{ fontSize: 13, color: theme.color.textMuted }}>{t.desc}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sub: { color: theme.color.textMuted, fontSize: 13, marginBottom: 18 },
  h2: { fontWeight: "800", fontSize: 17, marginBottom: 10 },
  p: { fontSize: 13.5, marginBottom: 8 },
  bold: { fontWeight: "700" },
  eventChip: { backgroundColor: "#F1EFF5", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
});
