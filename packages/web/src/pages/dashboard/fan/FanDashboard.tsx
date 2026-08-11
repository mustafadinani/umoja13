import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "@umoja/shared";
import { toggleFollowTeam } from "../../../lib/followTeam";
import { useAuth } from "../../../auth/AuthProvider";
import { theme, hunterGradient } from "../../../lib/theme";
import { useTeams } from "../../../hooks/useData";
import { Card, Pill } from "../../../components/ui";

export function FanDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: teams } = useTeams();
  const [followError, setFollowError] = useState<string | null>(null);
  const followed = new Set(profile?.followedTeamIds ?? []);

  async function toggleFollow(teamId: string) {
    if (!user || !profile) return;
    try {
      await toggleFollowTeam(user.uid, profile, teamId);
      setFollowError(null);
    } catch (err) {
      // Previously an uncaught updateDoc against a users/{uid} doc that
      // often doesn't exist for a real Outreach-registered fan — threw
      // NOT_FOUND silently, so the star looked like it did nothing.
      setFollowError(err instanceof Error ? err.message : "Couldn't follow this team — check your connection and try again.");
    }
  }

  return (
    <div className="page-shell-sm">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>MY DASHBOARD</div>

      {followError && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "10px 14px", fontSize: 12.5, fontWeight: 700, marginBottom: 16 }}>
          ⚠ {followError}
        </div>
      )}

      <div style={{ background: hunterGradient, color: "#fff", borderRadius: theme.radius.lg, padding: 18, marginBottom: 16, cursor: "pointer" }} onClick={() => navigate("/hunt")}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20 }}>JOIN THE HUNT</div>
        <div style={{ fontSize: 13.5, opacity: 0.92, marginTop: 4 }}>Make a crew of up to 4 and start earning points →</div>
      </div>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MY TEAMS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {CATEGORIES.map((cat) => {
          const catTeams = teams.filter((t) => t.categoryId === cat.id);
          if (catTeams.length === 0) return null;
          return (
            <div key={cat.id}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>{cat.label.toUpperCase()}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {catTeams.map((t) => (
                  <Pill
                    key={t.id}
                    active={followed.has(t.id)}
                    bg={followed.has(t.id) ? t.color : undefined}
                    onClick={() => toggleFollow(t.id)}
                  >
                    {followed.has(t.id) ? "★ " : ""}{t.name}
                  </Pill>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {followed.size > 0 && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Tap a team to see its roster & stats</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[...followed].map((id) => {
              const t = teams.find((tt) => tt.id === id);
              if (!t) return null;
              return <Pill key={id} onClick={() => navigate(`/team/${id}`)}>{t.name} →</Pill>;
            })}
          </div>
        </Card>
      )}

      <Card style={{ marginTop: 24, cursor: "pointer" }} onClick={() => navigate("/dashboard/report-issue")}>
        <div style={{ fontWeight: 600 }}>Report an issue to the commissioner</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4 }}>$35 review fee (test card payment)</div>
      </Card>
    </div>
  );
}
