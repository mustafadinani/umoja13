import { useState } from "react";
import { Pill } from "./ui";
import { PodChannelPanel } from "./PodChannelPanel";
import { PodTaskList } from "./PodTaskList";

type Tab = "chat" | "tasks";

/** Combined chat + task view for one pod — the shared surface reused by the admin Pods tab and every pod-eligible dashboard. */
export function PodHubPanel({ podId, canPost }: { podId: string; canPost: boolean }) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Pill active={tab === "chat"} onClick={() => setTab("chat")}>Chat</Pill>
        <Pill active={tab === "tasks"} onClick={() => setTab("tasks")}>Tasks</Pill>
      </div>
      {tab === "chat" ? <PodChannelPanel podId={podId} canPost={canPost} /> : <PodTaskList podId={podId} />}
    </div>
  );
}
