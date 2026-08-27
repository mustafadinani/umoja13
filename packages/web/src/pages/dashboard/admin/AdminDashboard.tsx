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
import { FeedbackAdminTab } from "./FeedbackAdminTab";
import { MyPodTasksSection } from "../../../components/MyPodTasksSection";
import { ADMIN_TABS, type AdminTab } from "./adminTabs";

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("games");

  return (
    <div className="page-shell" style={{ maxWidth: 1000 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>ADMIN</div>
      <MyPodTasksSection />
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {ADMIN_TABS.map((t) => (
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
      {tab === "feedback" && <FeedbackAdminTab />}
    </div>
  );
}
