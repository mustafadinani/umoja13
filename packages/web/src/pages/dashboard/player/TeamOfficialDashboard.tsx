import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, TOURNAMENT_DAY_DATES, compareGamesByKickoff, formatKickoffTime, type Game } from "@umoja/shared";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useGames, useTeam } from "../../../hooks/useData";
import { useMyManagedTeamIds } from "../../../hooks/useRegistration";
import { Card, Pill, StatusBadge } from "../../../components/ui";
import { RosterPanel } from "./RosterPanel";
import { TeamOfficialsCard } from "./TeamOfficialsCard";

/**
 * Renders for primaryRole "captain" or "coach_manager" (see Dashboard.tsx) —
 * scoped ENTIRELY to teams this account officiates, one team at a time via
 * the tabs below. Deliberately shares nothing with PlayerDashboard.tsx: no
 * kid tabs, check-in passes, "my teams," or "my games" — those are personal
 * player content that has nothing to do with officiating a team, and used to
 * bleed into this view when both lived on one stacked page (the original
 * complaint this redesign fixes). Someone who's both a player AND an
 * official switches between the two full views with the "VIEWING AS" pill,
 * not by scrolling past one to reach the other.
 */
export function TeamOfficialDashboard() {
  const { user, profile } = useAuth();
  const { data: myManagedTeamIds } = useMyManagedTeamIds(user?.uid);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  if (!user || !profile) return null;

  const memberships = profile.playerOf ?? [];
  const captainMemberships = memberships.filter((m) => m.isCaptain);
  const captainTeamIds = new Set(captainMemberships.map((m) => m.teamId));
  // Excludes anything already counted as a real/appointed captaincy above —
  // same de-dupe PlayerDashboard.tsx used to do — so a team never gets two tabs.
  const managedTeamIds = myManagedTeamIds.filter((id) => !captainTeamIds.has(id));
  const officiatedTeamIds = [...captainTeamIds, ...managedTeamIds];

  const selectedTeamId = activeTeamId && officiatedTeamIds.includes(activeTeamId) ? activeTeamId : officiatedTeamIds[0];

  return (
    <div className="page-shell-sm">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>TEAM OFFICIAL</div>

      {officiatedTeamIds.length === 0 ? (
        <div style={{ color: theme.color.textMuted, fontSize: 14 }}>
          You're not currently listed as an official on any team.
        </div>
      ) : (
        <>
          {officiatedTeamIds.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {officiatedTeamIds.map((id) => (
                <TeamTab key={id} teamId={id} active={id === selectedTeamId} onSelect={() => setActiveTeamId(id)} />
              ))}
            </div>
          )}
          {selectedTeamId && <TeamOfficialPanel teamId={selectedTeamId} />}
        </>
      )}
    </div>
  );
}

function TeamTab({ teamId, active, onSelect }: { teamId: string; active: boolean; onSelect: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <Pill active={active} onClick={onSelect}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: team.color, flexShrink: 0 }} />
        {team.name}
      </span>
    </Pill>
  );
}

function TeamOfficialPanel({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const { data: team } = useTeam(teamId);
  const { data: games } = useGames();
  const [subTab, setSubTab] = useState<"roster" | "schedule">("roster");

  if (!team) return null;
  const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: team.color,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: theme.font.display,
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          {team.name.trim().slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>{team.name}</div>
          <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginTop: 2 }}>
            {CATEGORIES.find((c) => c.id === team.categoryId)?.label ?? team.categoryId}
            {team.group ? ` · Group ${team.group}` : ""}
          </div>
        </div>
      </div>

      <TeamOfficialsCard team={team} />

      <div style={{ display: "flex", gap: 6, margin: "26px 0 14px", background: "#EFEDF5", borderRadius: theme.radius.sm, padding: 4 }}>
        {(["roster", "schedule"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              border: "none",
              background: subTab === t ? "#fff" : "transparent",
              color: theme.color.text,
              fontWeight: 700,
              fontSize: 12.5,
              letterSpacing: 0.3,
              cursor: "pointer",
              boxShadow: subTab === t ? "0 1px 2px rgba(33,26,51,0.08)" : "none",
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {subTab === "roster" ? <RosterPanel team={team} games={teamGames} /> : <TeamSchedulePanel games={teamGames} />}

      <Card style={{ marginTop: 24, cursor: "pointer" }} onClick={() => navigate("/dashboard/report-issue")}>
        <div style={{ fontWeight: 600 }}>Report an issue to the commissioner</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4 }}>About {team.name} · $35 review fee (test card payment)</div>
      </Card>
    </div>
  );
}

function TeamSchedulePanel({ games }: { games: Game[] }) {
  const sorted = [...games].sort(compareGamesByKickoff);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((g) => (
        <ScheduleGameRow key={g.id} game={g} />
      ))}
      {sorted.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No games scheduled yet.</div>}
    </div>
  );
}

function ScheduleGameRow({ game }: { game: Game }) {
  const navigate = useNavigate();
  const { data: home } = useTeam(game.homeTeamId);
  const { data: away } = useTeam(game.awayTeamId);
  const decided = game.status !== "scheduled";
  return (
    <Card
      onClick={() => navigate(`/game/${game.id}`)}
      style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, cursor: "pointer" }}
    >
      <div style={{ minWidth: 150 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>
          {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
        </div>
        <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
          {CATEGORIES.find((c) => c.id === game.categoryId)?.label ?? game.categoryId} · {game.day.toUpperCase()}, {TOURNAMENT_DAY_DATES[game.day]} · {game.field} · {formatKickoffTime(game.kickoffTime)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {decided && (
          <span style={{ fontWeight: 800, fontSize: 15 }}>
            {game.homeScore ?? 0}–{game.awayScore ?? 0}
          </span>
        )}
        <StatusBadge status={game.status} />
      </div>
    </Card>
  );
}
