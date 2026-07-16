/**
 * Central collection name registry — import these everywhere instead of
 * hardcoding strings, so web/mobile/functions/rules never drift apart.
 */
export const COLLECTIONS = {
  users: "users",
  categories: "categories",
  teams: "teams",
  games: "games",
  checkIns: "checkIns",
  tournamentPasses: "tournamentPasses",
  moments: "moments",
  announcements: "announcements",
  sponsors: "sponsors",
  notifications: "notifications",
  incidents: "incidents",
  huntCrews: "huntCrews",
  huntMissions: "huntMissions",
  huntSubmissions: "huntSubmissions",
  chatEscalations: "chatEscalations",
  counters: "counters",
  uatScenarios: "uatScenarios",
  uatBugs: "uatBugs",
  uatSignoffs: "uatSignoffs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
