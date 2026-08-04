import { useState } from "react";
import { Pill } from "./ui";
import { PodChannelPanel } from "./PodChannelPanel";
import { PodShiftsTab } from "./PodShiftsTab";
import { PodTasksTab } from "./PodTasksTab";

type Tab = "chat" | "shifts" | "tasks";

/** Combined chat + shifts + tasks view for one pod — the shared surface reused by the admin Pods tab and every pod-eligible dashboard. */
export function PodHubPanel({ podId, canPost }: { podId: string; canPost: boolean }) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Pill active={tab === "chat"} onClick={() => setTab("chat")}>Chat</Pill>
        <Pill active={tab === "shifts"} onClick={() => setTab("shifts")}>Shifts</Pill>
        <Pill active={tab === "tasks"} onClick={() => setTab("tasks")}>Tasks</Pill>
      </div>
      {tab === "chat" && <PodChannelPanel podId={podId} canPost={canPost} />}
      {tab === "shifts" && <PodShiftsTab podId={podId} />}
      {tab === "tasks" && <PodTasksTab podId={podId} />}
    </div>
  );
}
