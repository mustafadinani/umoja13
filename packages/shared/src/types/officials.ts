/**
 * A team official is anyone with jersey-editing/complaint tools for a team —
 * either kind is granted the same account-level `captain` role (see
 * assignTeamOfficial in the backend); this only labels *why* they have it,
 * for display (badges in the officials-management UI, roster "(C)" tags).
 * `coach_manager` is NOT one of these — it still exists as legacy data on
 * accounts appointed before this type was introduced, but nothing assigns it
 * going forward (see roles.ts's roleIncludesPlayerDashboard, which still
 * treats it as equivalent to `captain` for dashboard-gating purposes).
 */
export const OFFICIAL_KINDS = ["captain", "manager_coach"] as const;
export type OfficialKind = (typeof OFFICIAL_KINDS)[number];

export const OFFICIAL_KIND_LABELS: Record<OfficialKind, string> = {
  captain: "Captain",
  manager_coach: "Manager/Coach",
};

/**
 * Hard cap on assignable team officials, enforced server-side in
 * assignTeamOfficial. Counts distinct appointed-co-captain playerKeys
 * (RosterCheckIn.appointedCaptain) plus distinct Team.coachManagerUids —
 * deliberately does NOT count the team's real registration captain
 * (RegisteredTeam.captainProfileId): nothing in assignTeamOfficial ever
 * writes that field, so it was never part of this assignable pool to begin
 * with, and a team can have it plus up to MAX_TEAM_OFFICIALS more.
 * Also doesn't attempt to cross-dedupe one person holding both an
 * appointed-captain playerKey and a coachManagerUids entry on the same
 * team — two different identity spaces (playerKey vs account uid); rare
 * enough overlap that counting them twice is an accepted simplification.
 */
export const MAX_TEAM_OFFICIALS = 4;
