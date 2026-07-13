import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme, hunterGradient } from "../../../lib/theme";
import { useTeams } from "../../../hooks/useData";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { JoinTeamModal } from "../../../components/JoinTeamModal";

export function FanDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: teams } = useTeams();
  const [joinOpen, setJoinOpen] = useState(false);
  const followed = new Set(profile?.followedTeamIds ?? []);

  async function toggleFollow(teamId: string) {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
      followedTeamIds: followed.has(teamId) ? arrayRemove(teamId) : arrayUnion(teamId),
    });
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>MY DASHBOARD</div>

      <div style={{ background: hunterGradient, color: "#fff", borderRadius: theme.radius.lg, padding: 18, marginBottom: 16, cursor: "pointer" }} onClick={() => navigate("/hunt")}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20 }}>JOIN THE HUNT</div>
        <div style={{ fontSize: 13.5, opacity: 0.92, marginTop: 4 }}>Make a crew of up to 4 and start earning points →</div>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Playing in the tournament?</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 12 }}>
          Join a team roster to unlock check-in, your schedule, and team standings.
        </div>
        <PrimaryButton onClick={() => setJoinOpen(true)}>JOIN A TEAM</PrimaryButton>
      </Card>

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

      {joinOpen && <JoinTeamModal onClose={() => setJoinOpen(false)} />}
    </div>
  );
}
