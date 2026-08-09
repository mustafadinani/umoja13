import { useState } from "react";
import { theme } from "../../../lib/theme";
import { Pill } from "../../../components/ui";
import { AllGamesTab } from "./AllGamesTab";
import { TeamsAdminTab } from "./TeamsAdminTab";
import { LiveDrawTab } from "./LiveDrawTab";
import { CheckInsTab } from "./CheckInsTab";
import { PlayersAdminTab } from "./PlayersAdminTab";
import { ModerationOpsTab } from "./ModerationOpsTab";
import { HuntAdminTab } from "./HuntAdminTab";
import { VolunteersTab } from "./VolunteersTab";
import { SponsorsAdminTab } from "./SponsorsAdminTab";
import { NotificationsAdminTab } from "./NotificationsAdminTab";
import { TeamChannelsAdminTab } from "./TeamChannelsAdminTab";
import { UserChannelsAdminTab } from "./UserChannelsAdminTab";
import { PodsAdminTab } from "./PodsAdminTab";
import { UsersAdminTab } from "./UsersAdminTab";
import { AwardsAdminTab } from "./AwardsAdminTab";
import { MyPodTasksSection } from "../../../components/MyPodTasksSection";

type Tab = "games" | "teams" | "liveDraw" | "players" | "checkins" | "ops" | "hunt" | "volunteers" | "sponsors" | "notifications" | "teamChannels" | "messages" | "pods" | "users" | "awards";
const TABS: { id: Tab; label: string }[] = [
  { id: "games", label: "All Games" },
  { id: "teams", label: "Teams" },
  { id: "liveDraw", label: "Live Draw" },
  { id: "players", label: "Players" },
  { id: "checkins", label: "Player Check-ins" },
  { id: "ops", label: "Moderation & Ops" },
  { id: "hunt", label: "The Hunt" },
  { id: "volunteers", label: "Volunteers" },
  { id: "sponsors", label: "Sponsors" },
  { id: "notifications", label: "Notifications" },
  { id: "teamChannels", label: "Team Channels" },
  { id: "messages", label: "Messages" },
  { id: "pods", label: "Pods" },
  { id: "users", label: "Users" },
  { id: "awards", label: "Awards" },
];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("games");

  return (
    <div className="page-shell" style={{ maxWidth: 1000 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>ADMIN</div>
      <MyPodTasksSection />
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>
        ))}
      </div>
      {tab === "games" && <AllGamesTab />}
      {tab === "teams" && <TeamsAdminTab />}
      {tab === "liveDraw" && <LiveDrawTab />}
      {tab === "players" && <PlayersAdminTab />}
      {tab === "checkins" && <CheckInsTab />}
      {tab === "ops" && <ModerationOpsTab />}
      {tab === "hunt" && <HuntAdminTab />}
      {tab === "volunteers" && <VolunteersTab />}
      {tab === "sponsors" && <SponsorsAdminTab />}
      {tab === "notifications" && <NotificationsAdminTab />}
      {tab === "teamChannels" && <TeamChannelsAdminTab />}
      {tab === "messages" && <UserChannelsAdminTab />}
      {tab === "pods" && <PodsAdminTab />}
      {tab === "users" && <UsersAdminTab />}
      {tab === "awards" && <AwardsAdminTab />}
    </div>
  );
}
