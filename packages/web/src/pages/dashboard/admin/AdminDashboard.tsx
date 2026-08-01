import { useState } from "react";
import { theme } from "../../../lib/theme";
import { Pill } from "../../../components/ui";
import { AllGamesTab } from "./AllGamesTab";
import { TeamsAdminTab } from "./TeamsAdminTab";
import { CheckInsTab } from "./CheckInsTab";
import { PlayersAdminTab } from "./PlayersAdminTab";
import { ModerationOpsTab } from "./ModerationOpsTab";
import { HuntAdminTab } from "./HuntAdminTab";
import { VolunteersTab } from "./VolunteersTab";
import { SponsorsAdminTab } from "./SponsorsAdminTab";
import { NotificationsAdminTab } from "./NotificationsAdminTab";
import { TeamChannelsAdminTab } from "./TeamChannelsAdminTab";
import { UserChannelsAdminTab } from "./UserChannelsAdminTab";

type Tab = "games" | "teams" | "players" | "checkins" | "ops" | "hunt" | "volunteers" | "sponsors" | "notifications" | "teamChannels" | "messages";
const TABS: { id: Tab; label: string }[] = [
  { id: "games", label: "All Games" },
  { id: "teams", label: "Teams" },
  { id: "players", label: "Players" },
  { id: "checkins", label: "Player Check-ins" },
  { id: "ops", label: "Moderation & Ops" },
  { id: "hunt", label: "The Hunt" },
  { id: "volunteers", label: "Volunteers" },
  { id: "sponsors", label: "Sponsors" },
  { id: "notifications", label: "Notifications" },
  { id: "teamChannels", label: "Team Channels" },
  { id: "messages", label: "Messages" },
];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("games");

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>ADMIN</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>
        ))}
      </div>
      {tab === "games" && <AllGamesTab />}
      {tab === "teams" && <TeamsAdminTab />}
      {tab === "players" && <PlayersAdminTab />}
      {tab === "checkins" && <CheckInsTab />}
      {tab === "ops" && <ModerationOpsTab />}
      {tab === "hunt" && <HuntAdminTab />}
      {tab === "volunteers" && <VolunteersTab />}
      {tab === "sponsors" && <SponsorsAdminTab />}
      {tab === "notifications" && <NotificationsAdminTab />}
      {tab === "teamChannels" && <TeamChannelsAdminTab />}
      {tab === "messages" && <UserChannelsAdminTab />}
    </div>
  );
}
