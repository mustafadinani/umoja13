import { useState } from "react";
import { View, Text } from "react-native";
import type { Pod } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal, Pill } from "./ui";
import { PodChannelPanel } from "./PodChannelPanel";
import { PodTaskList } from "./PodTaskList";

type Tab = "chat" | "tasks";

/** Chat + task view for one pod, opened from a pod row in My Umoja. */
export function PodHubModal({ pod, onClose }: { pod: Pod; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 19, marginBottom: 14 }}>{pod.name}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <Pill active={tab === "chat"} onPress={() => setTab("chat")}>Chat</Pill>
        <Pill active={tab === "tasks"} onPress={() => setTab("tasks")}>Tasks</Pill>
      </View>
      {tab === "chat" ? <PodChannelPanel podId={pod.id} canPost /> : <PodTaskList podId={pod.id} />}
    </Modal>
  );
}
