import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { channelHasUnread } from "@umoja/shared";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { colorForSeed } from "../lib/podColors";
import { usePod, usePodChannel } from "../hooks/useData";
import { getPodMemberNames, markChannelRead } from "../lib/callables";
import { AvatarStack } from "../components/ui";
import { PodChannelPanel } from "../components/PodChannelPanel";
import { PodShiftsPanel } from "../components/PodShiftsPanel";
import { PodTasksPanel } from "../components/PodTasksPanel";

type Tab = "chat" | "shifts" | "tasks";

/**
 * A pod's whole world as a real pushed screen — header, back-swipe, member
 * roster you can actually see — replacing the old two-layer-modal flow
 * (PodHubModal → PodTaskList mixing tasks/shifts/games in one scroll).
 */
export function PodDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "PodDetail">) {
  const { podId } = route.params;
  const { user, profile } = useAuth();
  const { data: pod } = usePod(podId);
  const { data: channel } = usePodChannel(podId);
  const [tab, setTab] = useState<Tab>("chat");
  const [memberNames, setMemberNames] = useState<string[] | null>(null);

  const unread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);

  useEffect(() => {
    if (tab === "chat" && user) void markChannelRead({ kind: "pod", id: podId });
  }, [tab, podId, user]);

  useEffect(() => {
    getPodMemberNames({ podId })
      .then((res) => setMemberNames(res.data.members.map((m) => m.displayName)))
      .catch(() => setMemberNames(null));
  }, [podId]);

  useEffect(() => {
    if (pod) navigation.setOptions({ title: pod.name });
  }, [pod, navigation]);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!profile && !!pod?.memberUids.includes(profile.uid);
  const isVolunteer = profile?.roles.includes("volunteer") ?? false;
  const canAddPeople = isStaff || (isPodMember && isVolunteer);

  if (!pod) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: theme.color.border, backgroundColor: "#fff" }}>
        <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
          {pod.fields.length > 0 ? (
            pod.fields.map((f) => (
              <Text key={f} style={{ fontSize: 10.5, fontWeight: "700", color: theme.color.teal, backgroundColor: "#E7F7F4", borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                {f}
              </Text>
            ))
          ) : (
            <Text style={{ fontSize: 10.5, fontWeight: "700", color: theme.color.textMuted, backgroundColor: theme.color.bg, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
              No fields assigned
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("PodMembers", { podId })}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}
        >
          <AvatarStack names={memberNames ?? pod.memberUids} size={24} colorFor={colorForSeed} max={4} />
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: theme.color.purple }}>See all {pod.memberUids.length} →</Text>
        </TouchableOpacity>
      </View>

      {canAddPeople && (
        <TouchableOpacity
          onPress={() => navigation.navigate("PodMembers", { podId })}
          style={{
            flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 14, marginTop: 12,
            padding: 12, borderRadius: theme.radius.sm, borderWidth: 1.5, borderStyle: "dashed", borderColor: theme.color.purple, backgroundColor: "#F6EEFC",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "800", color: theme.color.purple }}>+ ADD PEOPLE</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.color.purple }}>{pod.memberUids.length} members</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: "row", marginTop: 14, borderBottomWidth: 1, borderBottomColor: theme.color.border }}>
        {(
          [
            { id: "chat" as const, label: "💬 Chat" },
            { id: "shifts" as const, label: "🗓 Shifts" },
            { id: "tasks" as const, label: "✅ Tasks" },
          ]
        ).map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: tab === t.id ? theme.color.purple : "transparent" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "800", color: tab === t.id ? theme.color.purple : theme.color.textMuted }}>{t.label}</Text>
              {t.id === "chat" && unread && <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: theme.color.pink }} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={tab === "chat" ? { padding: 14, flexGrow: 1 } : undefined} keyboardShouldPersistTaps="handled">
        {tab === "chat" && <PodChannelPanel podId={podId} canPost />}
        {tab === "shifts" && <PodShiftsPanel podId={podId} />}
        {tab === "tasks" && <PodTasksPanel podId={podId} />}
      </ScrollView>
    </View>
  );
}
