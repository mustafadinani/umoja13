import { useEffect, useState } from "react";
import { channelHasUnread } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { usePodChannel } from "../hooks/useData";
import { markChannelRead } from "../lib/callables";
import { theme } from "../lib/theme";
import { Pill } from "./ui";
import { PodChannelPanel } from "./PodChannelPanel";
import { PodShiftsTab } from "./PodShiftsTab";
import { PodTasksTab } from "./PodTasksTab";

type Tab = "chat" | "shifts" | "tasks";

/** Combined chat + shifts + tasks view for one pod — the shared surface reused by the admin Pods tab and every pod-eligible dashboard. */
export function PodHubPanel({ podId, canPost }: { podId: string; canPost: boolean }) {
  const { user } = useAuth();
  const { data: channel } = usePodChannel(podId);
  const [tab, setTab] = useState<Tab>("chat");
  const unread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);

  useEffect(() => {
    if (tab === "chat" && user) void markChannelRead({ kind: "pod", id: podId });
  }, [tab, podId, user]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Pill active={tab === "chat"} onClick={() => setTab("chat")}>
          Chat
          {unread && (
            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: theme.color.pink, marginLeft: 6 }} />
          )}
        </Pill>
        <Pill active={tab === "shifts"} onClick={() => setTab("shifts")}>Shifts</Pill>
        <Pill active={tab === "tasks"} onClick={() => setTab("tasks")}>Tasks</Pill>
      </div>
      {tab === "chat" && <PodChannelPanel podId={podId} canPost={canPost} />}
      {tab === "shifts" && <PodShiftsTab podId={podId} />}
      {tab === "tasks" && <PodTasksTab podId={podId} />}
    </div>
  );
}
