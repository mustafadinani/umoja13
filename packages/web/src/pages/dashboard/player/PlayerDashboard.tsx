import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, TODDLERS_CAMP_CATEGORY_LABELS, TOURNAMENT_DAY_DATES, compareGamesByKickoff, formatKickoffTime, type Game, type PlayerMembership } from "@umoja/shared";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useGames, useSponsors, useTeam } from "../../../hooks/useData";
import { Card, Pill, StatusBadge } from "../../../components/ui";
import { SponsorStrip } from "../../../components/SponsorStrip";
import { CheckInCard } from "./CheckInCard";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Personal player content only — team-officiating tools (captain/coach
 * manager) live entirely on TeamOfficialDashboard now, rendered instead of
 * this whenever primaryRole is "captain" or "coach_manager" (see
 * Dashboard.tsx). They used to be stacked at the bottom of this same page,
 * which meant viewing "as" Coach/Manager still showed your own kids' check-in
 * passes and games — content that has nothing to do with officiating a team.
 * Someone who's both a player and an official switches between the two full
 * views with the "VIEWING AS" pill instead.
 */
export function PlayerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: games } = useGames();
  const { data: sponsors } = useSponsors();
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

  return (
    <div className="page-shell-sm">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>MY DASHBOARD</div>

      {/*
        Registration (and getting placed on a team's roster) happens entirely
        on our external registration site, never here — so there's no
        self-service "join a team" fallback for someone with no memberships
        yet. This block just renders nothing for them.
      */}
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
              // Toddlers Camp registrants have a real categoryId that's
              // intentionally NOT in CATEGORIES (no games/standings for camp)
              // — they still go through the same real check-in flow as
              // everyone else (CheckInCard itself falls back to their camp
              // label via TODDLERS_CAMP_CATEGORY_LABELS); only a genuinely
              // unmatched categoryId falls through to "Registration issue".
              const valid = activeMemberships.filter(
                (m) => CATEGORIES.some((c) => c.id === m.categoryId) || TODDLERS_CAMP_CATEGORY_LABELS[m.categoryId]
              );
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
            {[...myGames].sort(compareGamesByKickoff).map((g) => (
              <MyGameRow key={g.id} game={g} onOpen={() => navigate(`/game/${g.id}`)} />
            ))}
            {myGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No games scheduled yet.</div>}
          </div>
        </>
      )}

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

/**
 * Richer than the old version — that one showed only day/field/time behind
 * a category label that (by mistake) navigated to the generic /schedule
 * page instead of this specific game. Now the whole tile is one target
 * (matching Schedule.tsx's own GameRow: opponent names, real date, and a
 * score once the game isn't still scheduled) and always goes to /game/:id.
 */
function MyGameRow({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const { data: home } = useTeam(game.homeTeamId);
  const { data: away } = useTeam(game.awayTeamId);
  const decided = game.status !== "scheduled";
  return (
    <Card onClick={onOpen} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <div style={{ minWidth: 150 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{home?.name ?? "TBD"} vs {away?.name ?? "TBD"}</div>
        <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
          {CATEGORIES.find((c) => c.id === game.categoryId)?.label ?? game.categoryId} · {game.day.toUpperCase()}, {TOURNAMENT_DAY_DATES[game.day]} · {game.field} · {formatKickoffTime(game.kickoffTime)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {decided && <span style={{ fontWeight: 800, fontSize: 15 }}>{game.homeScore ?? 0}–{game.awayScore ?? 0}</span>}
        <StatusBadge status={game.status} />
      </div>
    </Card>
  );
}
