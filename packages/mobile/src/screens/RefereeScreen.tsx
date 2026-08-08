import { useState } from "react";
import { where } from "firebase/firestore";
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CATEGORIES, formatKickoffTime } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames } from "../hooks/useData";
import { Card, Pill, StatusBadge } from "../components/ui";
import { RoleChannelPanel } from "../components/RoleChannelPanel";

type Tab = "assignments" | "channel";

export function RefereeScreen({ navigation }: BottomTabScreenProps<any>) {
  const { user } = useAuth();
  const { data: games } = useGames(user ? [where("refereeUid", "==", user.uid)] : []);
  const [tab, setTab] = useState<Tab>("assignments");

  const sorted = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const gateNeeded = sorted.filter((g) => g.status !== "final" && g.status !== "forfeited" && !g.gateCheck?.completedAt);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>REFEREE</Text>
        <Text style={styles.sub}>Tap into your game for gate check, match console, and game-card submission.</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
        <Pill active={tab === "assignments"} onPress={() => setTab("assignments")}>Assignments</Pill>
        <Pill active={tab === "channel"} onPress={() => setTab("channel")}>Channel</Pill>
      </View>

      {tab === "channel" ? (
        <View style={styles.section}>
          <RoleChannelPanel role="referee" />
        </View>
      ) : (
        <>
          {gateNeeded.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <View style={styles.warningBanner}>
                <Text style={{ color: theme.color.warning, fontWeight: "700" }}>
                  {gateNeeded.length} game{gateNeeded.length > 1 ? "s" : ""} still need a gate check
                </Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR ASSIGNMENTS</Text>
            <View style={{ gap: 8 }}>
              {sorted.map((g) => (
                <Card
                  key={g.id}
                  onPress={() => navigation.getParent()?.navigate("RefereeGame", { gameId: g.id })}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>{CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId}</Text>
                    <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>
                      {g.day.toUpperCase()} · {g.field} · {formatKickoffTime(g.kickoffTime)}
                      {!g.gateCheck?.completedAt && g.status !== "final" && (
                        <Text style={{ color: theme.color.warning, fontWeight: "700" }}> · Gate check needed</Text>
                      )}
                    </Text>
                  </View>
                  <StatusBadge status={g.status} />
                </Card>
              ))}
              {sorted.length === 0 && <Text style={{ color: theme.color.textMuted }}>No games assigned yet.</Text>}
            </View>
          </View>
        </>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontWeight: "800", fontSize: 28, marginBottom: 4 },
  sub: { color: theme.color.textMuted, fontSize: 13.5 },
  warningBanner: { backgroundColor: theme.color.warningBg, borderRadius: theme.radius.lg, padding: 14 },
  section: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
});
