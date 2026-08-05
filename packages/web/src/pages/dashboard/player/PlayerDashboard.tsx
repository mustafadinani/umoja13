import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, type PlayerMembership } from "@umoja/shared";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useGames, useSponsors, useTeam } from "../../../hooks/useData";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { JoinTeamModal } from "../../../components/JoinTeamModal";
import { SponsorStrip } from "../../../components/SponsorStrip";
import { CheckInCard } from "./CheckInCard";
import { CaptainRoster } from "./CaptainRoster";
import { ComplaintModal } from "./ComplaintModal";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function PlayerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: games } = useGames();
  const { data: sponsors } = useSponsors();
  const [joinOpen, setJoinOpen] = useState(false);
  const [complaintTeam, setComplaintTeam] = useState<string | null>(null);
  const [activeKid, setActiveKid] = useState<string | null>(null);
  const memberships = profile?.playerOf ?? [];

  // One parent account can hold memberships for several kids — group by
  // whichever name each membership was joined under, so each kid gets their
  // own tab instead of everything stacking under one flat list.
  const kidGroups = useMemo(() => {
    const groups = new Map<string, PlayerMembership[]>();
    for (const m of memberships) {
      const key = (m.playerName ?? profile?.displayName ?? "Player").trim();
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    return groups;
  }, [memberships, profile?.displayName]);
  const kidNames = [...kidGroups.keys()];
  const selectedKid = activeKid && kidGroups.has(activeKid) ? activeKid : kidNames[0];
  const activeMemberships = kidGroups.get(selectedKid ?? "") ?? [];

  if (!user || !profile) return null;

  const myTeamIds = new Set(activeMemberships.map((m) => m.teamId));
  const myGames = games.filter((g) => myTeamIds.has(g.homeTeamId) || myTeamIds.has(g.awayTeamId));
  const captainMemberships = activeMemberships.filter((m) => m.isCaptain);

  return (
    <div className="page-shell-sm">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>MY DASHBOARD</div>

      {memberships.length === 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>You're not on a roster yet</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 12 }}>Join a team to unlock check-in, your schedule, and team standings.</div>
          <PrimaryButton onClick={() => setJoinOpen(true)}>JOIN A TEAM</PrimaryButton>
        </Card>
      )}

      {memberships.length > 0 && (
        <>
          {kidNames.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {kidNames.map((name) => (
                <Pill key={name} active={selectedKid === name} onClick={() => setActiveKid(name)}>{firstName(name)}</Pill>
              ))}
            </div>
          )}

          <PlayerPhotosCard
            playerName={selectedKid ?? profile.displayName}
            accountPhotoUrl={profile.photoUrl}
            registrationPhotoUrl={activeMemberships.find((m) => m.registrationPhotoUrl)?.registrationPhotoUrl}
          />

          <SectionLabel>CHECK-IN</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {(() => {
              const valid = activeMemberships.filter((m) => CATEGORIES.some((c) => c.id === m.categoryId));
              if (valid.length > 0) {
                return valid.map((m) => (
                  <CheckInCard key={`${m.teamId}-${m.categoryId}`} uid={user.uid} membership={m} />
                ));
              }
              if (activeMemberships.length > 0) {
                return (
                  <Card style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700 }}>Registration issue</div>
                    <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 4, lineHeight: 1.45 }}>
                      We found a registration but ran into an issue matching it to a tournament category. Please contact Umoja so we can correct it.
                    </div>
                  </Card>
                );
              }
              return null;
            })()}
          </div>

          <SectionLabel>MY TEAMS & STANDINGS</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {activeMemberships.map((m) => <TeamStandingRow key={m.teamId} teamId={m.teamId} onOpen={() => navigate(`/team/${m.teamId}`)} />)}
          </div>

          <SectionLabel>MY GAMES</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {myGames.map((g) => (
              <Card key={g.id} onClick={() => navigate(`/game/${g.id}`)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <span
                  onClick={(e) => { e.stopPropagation(); navigate(`/schedule`); }}
                  style={{ fontSize: 12.5, color: theme.color.blue, fontWeight: 700, cursor: "pointer" }}
                >
                  {CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId}
                </span>
                <span style={{ fontSize: 13.5 }}>{g.day.toUpperCase()} · {g.field} · {g.kickoffTime}</span>
              </Card>
            ))}
            {myGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No games scheduled yet.</div>}
          </div>

          {captainMemberships.length > 0 && (
            <>
              <SectionLabel>CAPTAIN TOOLS</SectionLabel>
              {captainMemberships.map((m) => <CaptainSection key={m.teamId} teamId={m.teamId} onComplaint={() => setComplaintTeam(m.teamId)} />)}
            </>
          )}
        </>
      )}

      {joinOpen && <JoinTeamModal onClose={() => setJoinOpen(false)} />}
      {complaintTeam && <ComplaintTeamWrapper teamId={complaintTeam} onClose={() => setComplaintTeam(null)} />}

      <div style={{ marginTop: 32 }}>
        <Card onClick={() => navigate("/dashboard/report-issue")} style={{ cursor: "pointer" }}>
          <div style={{ fontWeight: 600 }}>Report an issue to the commissioner</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4 }}>$35 review fee (test card payment)</div>
        </Card>
      </div>

      <div style={{ marginTop: 24 }}>
        <SponsorStrip sponsors={sponsors} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{children}</div>;
}

function PlayerPhotosCard({
  playerName,
  accountPhotoUrl,
  registrationPhotoUrl,
}: {
  playerName: string;
  accountPhotoUrl?: string;
  registrationPhotoUrl?: string;
}) {
  return (
    <Card style={{ padding: 16, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{playerName}</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <PhotoSlot label="Account holder" url={accountPhotoUrl} name={playerName} />
        <PhotoSlot label="Registration" url={registrationPhotoUrl} name={playerName} />
      </div>
    </Card>
  );
}

function PhotoSlot({ label, url, name }: { label: string; url?: string; name: string }) {
  const initials = name.trim().slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 88 }}>
      {url ? (
        <img
          src={url}
          alt={`${label} photo`}
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.color.border}`, background: "#fff" }}
        />
      ) : (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: theme.color.navy,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 18,
            fontFamily: theme.font.display,
          }}
        >
          {initials}
        </div>
      )}
      <div style={{ fontSize: 11.5, fontWeight: 700, color: theme.color.textMuted, letterSpacing: 0.3 }}>{label.toUpperCase()}</div>
      {!url && <div style={{ fontSize: 11, color: theme.color.textMuted }}>No photo</div>}
    </div>
  );
}

function TeamStandingRow({ teamId, onOpen }: { teamId: string; onOpen: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <Card onClick={onOpen} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
      <span style={{ fontWeight: 700, color: team.color }}>{team.name}</span>
      <span style={{ fontSize: 13, color: theme.color.textMuted }}>
        #{team.stats.groupRank ?? "—"} · {team.stats.wins}-{team.stats.draws}-{team.stats.losses} · {team.stats.points} PTS
      </span>
    </Card>
  );
}

function CaptainSection({ teamId, onComplaint }: { teamId: string; onComplaint: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <CaptainRoster team={team} />
      <PrimaryButton style={{ marginTop: 12 }} onClick={onComplaint}>FILE A COMPLAINT</PrimaryButton>
    </div>
  );
}

function ComplaintTeamWrapper({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return <ComplaintModal teamName={team.name} onClose={onClose} />;
}
