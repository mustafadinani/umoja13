import { useState } from "react";
import { View, Text } from "react-native";
import type { Pod } from "@umoja/shared";
import { theme } from "../lib/theme";
import { colorForSeed } from "../lib/podColors";
import { Modal, Pill } from "./ui";
import { PodChannelPanel } from "./PodChannelPanel";
import { PodTaskList } from "./PodTaskList";

type Tab = "chat" | "tasks";

/** Chat + task view for one pod, opened from a pod row in My Umoja. */
export function PodHubModal({ pod, onClose }: { pod: Pod; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("chat");
  const color = colorForSeed(pod.id);

  return (
    <Modal visible onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 17 }}>{pod.isGeneral ? "🌐" : "📍"}</Text>
        </View>
        <View>
          <Text style={{ fontWeight: "800", fontSize: 18 }}>{pod.name}</Text>
          <Text style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 1 }}>
            {pod.memberUids.length} {pod.memberUids.length === 1 ? "person" : "people"}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <Pill active={tab === "chat"} onPress={() => setTab("chat")}>💬 Chat</Pill>
        <Pill active={tab === "tasks"} onPress={() => setTab("tasks")}>✅ Tasks & Shifts</Pill>
      </View>
      {tab === "chat" ? <PodChannelPanel podId={pod.id} canPost /> : <PodTaskList podId={pod.id} />}
    </Modal>
  );
}
