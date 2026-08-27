import { View, Text, ScrollView, StyleSheet, Linking } from "react-native";
import { HUNT_RULES, HUNT_RULES_CONTACT_EMAIL, HUNT_RULES_VERSION } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * Official Rules for the Umoja Games 2026 Scavenger Hunt — required by App
 * Store Guideline 5.3.2 to be available at all times, not just shown once.
 * Content lives in @umoja/shared's huntRules.ts so web's HuntRules.tsx
 * renders the identical text. Plain ScrollView/Text, matching the app's
 * only other precedent for static legal-ish copy (CheckInScreen's consent
 * text) — there's no WebView/markdown renderer anywhere in this app.
 */
export function HuntRulesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.updated}>Last updated {HUNT_RULES_VERSION}</Text>

      {HUNT_RULES.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.contact}>
        Questions? Email{" "}
        <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${HUNT_RULES_CONTACT_EMAIL}`)}>
          {HUNT_RULES_CONTACT_EMAIL}
        </Text>
        .
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 48 },
  updated: { color: theme.color.textMuted, fontSize: 12.5, marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: { fontWeight: "800", fontSize: 15.5, color: theme.color.navy, marginBottom: 8 },
  bulletRow: { flexDirection: "row", marginBottom: 8, paddingRight: 4 },
  bulletDot: { fontSize: 14, color: theme.color.textMuted, marginRight: 8, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: theme.color.text },
  contact: { fontSize: 12.5, color: theme.color.textMuted, marginTop: 8 },
  link: { color: theme.color.blue },
});
