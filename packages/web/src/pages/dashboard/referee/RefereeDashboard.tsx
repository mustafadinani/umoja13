import { useEffect, useState } from "react";
import { where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, channelHasUnread, formatKickoffTime } from "@umoja/shared";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useGames, useRoleChannel } from "../../../hooks/useData";
import { markChannelRead } from "../../../lib/callables";
import { Card, Pill, StatusBadge } from "../../../components/ui";
import { RoleChannelPanel } from "../../../components/RoleChannelPanel";
import { MyPodTasksSection } from "../../../components/MyPodTasksSection";

type Tab = "assignments" | "channel";

export function RefereeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: games } = useGames(user ? [where("refereeUids", "array-contains", user.uid)] : []);
  const { data: channel } = useRoleChannel("referee");
  const [tab, setTab] = useState<Tab>("assignments");
  const channelUnread = channelHasUnread(channel?.messages, channel?.lastReadBy, user?.uid);

  useEffect(() => {
    if (tab === "channel" && user) void markChannelRead({ kind: "role", id: "referee" });
  }, [tab, user]);

  const sorted = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const gateNeeded = sorted.filter((g) => g.status !== "final" && g.status !== "forfeited" && !g.gateCheck?.completedAt);

  return (
    <div className="page-shell-sm">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>REFEREE</div>
      <div style={{ color: theme.color.textMuted, fontSize: 14, marginBottom: 20 }}>
        Tap into your game for gate check, match console, and game-card submission.
      </div>

      <MyPodTasksSection />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill active={tab === "assignments"} onClick={() => setTab("assignments")}>Assignments</Pill>
        <Pill active={tab === "channel"} onClick={() => setTab("channel")}>
          Channel
          {channelUnread && (
            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: theme.color.pink, marginLeft: 6 }} />
          )}
        </Pill>
      </div>

      {tab === "channel" ? (
        <RoleChannelPanel role="referee" />
      ) : (
        <>
          {gateNeeded.length > 0 && (
            <Card style={{ background: theme.color.warningBg, border: "none", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: theme.color.warning }}>
                {gateNeeded.length} game{gateNeeded.length > 1 ? "s" : ""} still need a gate check
              </div>
            </Card>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((g) => (
              <Card key={g.id} onClick={() => navigate(`/referee/game/${g.id}`)} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontWeight: 700 }}>{CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId}</div>
                  <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>
                    {g.day.toUpperCase()} · {g.field} · {formatKickoffTime(g.kickoffTime)}
                    {!g.gateCheck?.completedAt && g.status !== "final" && (
                      <span style={{ color: theme.color.warning, fontWeight: 700 }}> · Gate check needed</span>
                    )}
                  </div>
                </div>
                <StatusBadge status={g.status} />
              </Card>
            ))}
            {sorted.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No games assigned yet.</div>}
          </div>
        </>
      )}
    </div>
  );
}
