import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { channelHasUnread } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { colorForSeed } from "../lib/podColors";
import { useMyPods, useMyPodTasks, usePodChannel } from "../hooks/useData";
import { getPodMemberNames } from "../lib/callables";
import { Card, AvatarStack, PrimaryButton } from "../components/ui";
import { VolunteerSignupModal } from "../components/VolunteerSignupModal";
import { PodTaskDetailModal } from "../components/PodTaskDetailModal";

// Same set ensureInGeneralPod/listOpenPods treat as pod-eligible on the backend.
const POD_ELIGIBLE_ROLES = ["admin", "commissioner", "referee", "volunteer"];

const EXPERIENCE_TILES = [
  { key: "HubInfo" as const, icon: "ℹ️", name: "Info", sub: "FAQs & venue hours", colors: ["#0FAE9E", "#0B8478"] as const },
  { key: "HubTravel" as const, icon: "✈️", name: "Travel", sub: "Hotels & deals", colors: ["#2563EB", "#1E4FC4"] as const },
  { key: "HubLocal" as const, icon: "🎡", name: "Local", sub: "Nearby attractions", colors: ["#F2856F", "#D9654F"] as const },
  { key: "HubMuslim" as const, icon: "🌙", name: "Muslim Guide", sub: "Prayer times, halal food", colors: ["#FDB528", "#E09A0E"] as const },
];

/**
 * "Everything besides the games" — a hybrid layout: Pods keeps real weight
 * up top (your actual pod, not just a link to it), Experiences becomes a
 * tappable tile launcher below one clear header. The field map lives on the
 * Games tab now, next to the schedule it's actually about.
 */
export function HubScreen({ navigation }: BottomTabScreenProps<any>) {
  const { profile } = useAuth();
  const [volunteerOpen, setVolunteerOpen] = useState(false);
  const eligible = profile?.roles.some((r) => POD_ELIGIBLE_ROLES.includes(r)) ?? false;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.header}>
        <Text style={styles.title}>HUB</Text>
        <Text style={styles.sub}>Everything besides the games — where to help and what to do.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🙋 PODS</Text>
        {eligible ? (
          <PodsHero navigation={navigation} onBecomeVolunteer={() => setVolunteerOpen(true)} />
        ) : (
          <LinearGradient colors={["#8B2FD1", "#6E1FAE"]} style={styles.ctaCard}>
            <Text style={{ fontSize: 30 }}>🙋</Text>
            <Text style={styles.ctaTitle}>Pods are for volunteers</Text>
            <Text style={styles.ctaBody}>
              Sign up once and get placed with a crew, a zone, and your own shift schedule for the weekend.
            </Text>
            <TouchableOpacity onPress={() => setVolunteerOpen(true)} style={styles.ctaBtn}>
              <Text style={{ fontWeight: "800", fontSize: 13, color: "#6E1FAE" }}>BECOME A VOLUNTEER</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌍 EXPERIENCES</Text>
        <View style={styles.tileGrid}>
          {EXPERIENCE_TILES.map((t) => (
            <TouchableOpacity key={t.key} activeOpacity={0.85} style={styles.tileWrap} onPress={() => navigation.getParent()?.navigate(t.key)}>
              <LinearGradient colors={t.colors} style={styles.tile}>
                <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                <View>
                  <Text style={styles.tileName}>{t.name}</Text>
                  <Text style={styles.tileSub}>{t.sub}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {volunteerOpen && <VolunteerSignupModal onClose={() => setVolunteerOpen(false)} initialName={profile?.displayName} />}
    </ScrollView>
  );
}

/** The user's primary pod as a real hero card (icon, avatars, field, unread dot) plus their next due task — not just a link pointing elsewhere. */
function PodsHero({ navigation, onBecomeVolunteer }: { navigation: BottomTabScreenProps<any>["navigation"]; onBecomeVolunteer: () => void }) {
  const { user } = useAuth();
  const { data: pods } = useMyPods(user?.uid);
  const { data: tasks } = useMyPodTasks(user?.uid);
  const [memberNames, setMemberNames] = useState<string[] | null>(null);

  const sorted = [...pods].sort((a, b) => (a.isGeneral ? 1 : b.isGeneral ? -1 : a.name.localeCompare(b.name)));
  const primary = sorted[0] ?? null;
  const { data: channel } = usePodChannel(primary?.id);
  const unread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);

  useEffect(() => {
    if (!primary) return;
    getPodMemberNames({ podId: primary.id })
      .then((res) => setMemberNames(res.data.members.map((m) => m.displayName)))
      .catch(() => setMemberNames(null));
  }, [primary?.id]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextTask = tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    })[0];
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  if (!primary) {
    return (
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 14.5, marginBottom: 6 }}>Not on a pod yet</Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 19 }}>
          You're signed up as a volunteer, but not placed on a pod yet — browse open pods to join one yourself, or an organizer will place you soon.
        </Text>
        <PrimaryButton onPress={() => navigation.getParent()?.navigate("Pods")}>BROWSE PODS</PrimaryButton>
      </Card>
    );
  }

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.getParent()?.navigate("PodDetail", { podId: primary.id })}
        style={styles.podHero}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colorForSeed(primary.id), alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18 }}>{primary.isGeneral ? "🌐" : "📍"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 14.5 }}>{primary.name}</Text>
            <View style={{ marginTop: 5 }}>
              <AvatarStack names={memberNames ?? primary.memberUids} size={22} colorFor={colorForSeed} max={4} />
            </View>
          </View>
          {unread && <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: theme.color.pink }} />}
        </View>
        {primary.fields.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.fieldChip}>{primary.fields.join(", ")}</Text>
          </View>
        )}
      </TouchableOpacity>

      {sorted.length > 1 && (
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Pods")} style={{ alignSelf: "flex-end", marginTop: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: theme.color.purple }}>See all {sorted.length} pods →</Text>
        </TouchableOpacity>
      )}

      {nextTask && (
        <Card onPress={() => setOpenTaskId(nextTask.id)} style={{ marginTop: sorted.length > 1 ? 4 : 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontWeight: "700", fontSize: 13 }}>✅ {nextTask.title}</Text>
          {!!nextTask.dueDate && (
            <Text style={{ fontSize: 11, color: nextTask.dueDate < todayStr ? theme.color.danger : theme.color.textMuted, fontWeight: "700" }}>
              {nextTask.dueDate < todayStr ? "Overdue" : "Due soon"}
            </Text>
          )}
        </Card>
      )}
      {openTaskId && nextTask && <PodTaskDetailModal task={nextTask} canPost onClose={() => setOpenTaskId(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontWeight: "800", fontSize: 26, color: theme.color.text },
  sub: { color: theme.color.textMuted, fontSize: 13, marginTop: 4, lineHeight: 19 },
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 10 },
  divider: { height: 8, backgroundColor: theme.color.bg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.color.border, marginVertical: 20 },
  podHero: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.lg, padding: 14 },
  fieldChip: { alignSelf: "flex-start", fontSize: 10.5, fontWeight: "700", color: theme.color.teal, backgroundColor: "#E7F7F4", borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  ctaCard: { borderRadius: theme.radius.lg, padding: 22, alignItems: "center" },
  ctaTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 10 },
  ctaBody: { color: "#fff", opacity: 0.9, fontSize: 12.5, textAlign: "center", marginTop: 6, lineHeight: 18 },
  ctaBtn: { marginTop: 14, backgroundColor: "#fff", borderRadius: theme.radius.sm, paddingVertical: 11, paddingHorizontal: 20 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tileWrap: { width: "47%" },
  tile: { borderRadius: 16, padding: 14, minHeight: 96, justifyContent: "space-between" },
  tileName: { color: "#fff", fontWeight: "800", fontSize: 13.5, marginTop: 8 },
  tileSub: { color: "#fff", opacity: 0.88, fontSize: 10.5, marginTop: 2 },
});
