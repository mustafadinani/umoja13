import { useEffect, useState } from "react";
import { channelHasUnread } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { usePod, usePodChannel } from "../hooks/useData";
import { markChannelRead } from "../lib/callables";
import { theme } from "../lib/theme";
import { Pill } from "./ui";
import { PodChannelPanel } from "./PodChannelPanel";
import { PodShiftsTab } from "./PodShiftsTab";
import { PodTasksTab } from "./PodTasksTab";
import { AddPodPeopleModal } from "./AddPodPeopleModal";

type Tab = "chat" | "shifts" | "tasks";

/**
 * Combined chat + shifts + tasks view for one pod — the shared surface reused
 * by the admin Pods tab and every pod-eligible dashboard. The "+ Add People"
 * bar lives here, above the tabs, so it's the same one control on Chat,
 * Shifts, and Tasks alike — replacing what used to be two separate
 * mechanisms (a general search box on the admin tab, a volunteer-only
 * "Recruit" button that only lived inside Shifts).
 */
export function PodHubPanel({ podId, canPost }: { podId: string; canPost: boolean }) {
  const { user, profile } = useAuth();
  const { data: pod } = usePod(podId);
  const { data: channel } = usePodChannel(podId);
  const [tab, setTab] = useState<Tab>("chat");
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const unread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);

  useEffect(() => {
    if (tab === "chat" && user) void markChannelRead({ kind: "pod", id: podId });
  }, [tab, podId, user]);

  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isPodMember = !!profile && !!pod?.memberUids.includes(profile.uid);
  const isVolunteer = profile?.roles.includes("volunteer") ?? false;
  const canManage = isStaff;
  const canAddPeople = isStaff || (isPodMember && isVolunteer);

  return (
    <div>
      {pod && canAddPeople && (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            marginBottom: 16, padding: "10px 12px", background: theme.color.bg, borderRadius: theme.radius.sm, flexWrap: "wrap",
          }}
        >
          <div onClick={() => setAddPeopleOpen(true)} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {pod.memberUids.length} {pod.memberUids.length === 1 ? "person" : "people"} on this pod
            </div>
            <div style={{ fontSize: 10.5, color: theme.color.textMuted }}>Tap to view or add people</div>
          </div>
          <button
            onClick={() => setAddPeopleOpen(true)}
            style={{
              background: theme.color.purple, color: "#fff", border: "none", borderRadius: theme.radius.sm,
              padding: "9px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            + ADD PEOPLE
          </button>
        </div>
      )}

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

      {addPeopleOpen && pod && <AddPodPeopleModal pod={pod} canManage={canManage} onClose={() => setAddPeopleOpen(false)} />}
    </div>
  );
}
