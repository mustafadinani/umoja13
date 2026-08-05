import { CATEGORIES } from "../constants/categories.js";
import type { RegisteredPlayer, RegisteredTeam } from "../types/registration.js";
import type { RosterEntry, Team, TeamStats } from "../types/team.js";
import type { RosterCheckIn } from "../types/checkin.js";

const EMPTY_STATS: TeamStats = {
  wins: 0,
  draws: 0,
  losses: 0,
  points: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
};

const TEAM_COLORS = ["#7B3FA4", "#2E6BC0", "#37B3A6", "#D8365D", "#F2B95B", "#9256C4", "#EF5A4C", "#6FC2B5"];

function normalizeCategoryLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Map registration category strings (e.g. "Men's open", "Boy's 12 & under") onto umoja13 CATEGORIES ids. */
export function resolveCategoryId(registrationCategory: string | undefined): string {
  if (!registrationCategory?.trim()) return "";
  const needle = normalizeCategoryLabel(registrationCategory);
  const exact = CATEGORIES.find((c) => normalizeCategoryLabel(c.label) === needle);
  if (exact) return exact.id;
  // Tolerate minor punctuation / wording drift from older registration rows.
  const loose = CATEGORIES.find((c) => {
    const a = normalizeCategoryLabel(c.label).replace(/[^a-z0-9]/g, "");
    const b = needle.replace(/[^a-z0-9]/g, "");
    return a === b;
  });
  return loose?.id ?? registrationCategory;
}

/** Prefer an explicit categoryId on the registration row, else map from the label. */
export function resolvePlayerCategoryId(player: Pick<RegisteredPlayer, "category" | "categoryId">): string {
  const id = player.categoryId?.trim();
  if (id) return id;
  return resolveCategoryId(player.category);
}

function colorForTeamId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

function checkInStatusFromRegistration(status: string | undefined): RosterEntry["checkInStatus"] {
  const s = (status ?? "").toLowerCase();
  if (s.includes("approved") || s.includes("complete")) return "approved";
  if (s.includes("reject")) return "rejected";
  if (s.includes("pending") || s.includes("review")) return "pending_review";
  return "not_started";
}

export function registeredPlayerToRosterEntry(
  player: RegisteredPlayer,
  captainProfileId?: string,
  realCheckIn?: Pick<RosterCheckIn, "status" | "selfieUrl" | "jerseyNumber">
): RosterEntry {
  const userId = player.uid || player.id;
  return {
    userId,
    displayName: `${player.firstName} ${player.lastName}`.trim() || "Player",
    jerseyNumber: realCheckIn?.jerseyNumber,
    isCaptain: !!(captainProfileId && (player.uid === captainProfileId || player.id === captainProfileId)),
    goals: 0,
    assists: 0,
    // Prefer the real, admin-reviewed check-in status (rosterCheckIns) once one
    // exists — `player.status` is a registration/payment status ("Team
    // Registered"), not a tournament check-in signal, so it's only ever a
    // rough fallback before anyone has checked in for real.
    checkInStatus: realCheckIn?.status ?? checkInStatusFromRegistration(player.status),
    selfieUrl: realCheckIn?.selfieUrl ?? player.profilePicture ?? undefined,
  };
}

function playersForTeam(team: RegisteredTeam, players: RegisteredPlayer[]): RegisteredPlayer[] {
  const byId = players.filter((p) => p.teamId === team.id);
  if (byId.length > 0) return byId;
  // Fallback: older rows sometimes only share teamName with the team doc.
  const teamName = normalizeCategoryLabel(team.teamName ?? "");
  if (!teamName) return [];
  return players.filter((p) => normalizeCategoryLabel(p.teamName ?? "") === teamName);
}

export function buildTeamFromRegistration(
  team: RegisteredTeam,
  players: RegisteredPlayer[],
  rosterCheckIns: RosterCheckIn[] = []
): Team {
  const captainId = team.captainProfileId ?? team.uid;
  const checkInByUserId = new Map(
    rosterCheckIns.filter((r) => r.teamId === team.id).map((r) => [r.userId, r])
  );
  const roster = playersForTeam(team, players).map((p) =>
    registeredPlayerToRosterEntry(p, captainId, checkInByUserId.get(p.uid || p.id))
  );

  // Ensure captain is marked even if their player row uses a different uid field.
  if (captainId) {
    for (const entry of roster) {
      if (entry.userId === captainId) entry.isCaptain = true;
    }
  }

  return {
    id: team.id,
    name: team.teamName?.trim() || "Untitled team",
    categoryId: resolveCategoryId(team.category),
    color: colorForTeamId(team.id),
    captainUserId: captainId,
    roster,
    rosterUids: roster.map((r) => r.userId),
    stats: { ...EMPTY_STATS },
  };
}

export function buildTeamsFromRegistration(
  teams: RegisteredTeam[],
  players: RegisteredPlayer[],
  categoryId?: string,
  rosterCheckIns: RosterCheckIn[] = []
): Team[] {
  const mapped = teams.map((t) => buildTeamFromRegistration(t, players, rosterCheckIns));
  if (!categoryId) return mapped;
  return mapped.filter((t) => t.categoryId === categoryId);
}
