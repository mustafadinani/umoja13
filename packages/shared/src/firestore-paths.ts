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
  /** PII-free mirror of each check-in's status/selfie, keyed by team+player+category — the only
   * check-in data captains/referees/fans ever see; the checkIns docs themselves (gov ID, DOB) stay
   * restricted to the player and staff. Public read, same as teams/games. */
  rosterCheckIns: "rosterCheckIns",
  moments: "moments",
  announcements: "announcements",
  sponsors: "sponsors",
  notifications: "notifications",
  incidents: "incidents",
  huntCrews: "huntCrews",
  huntMissions: "huntMissions",
  huntSubmissions: "huntSubmissions",
  counters: "counters",
  uatScenarios: "uatScenarios",
  uatBugs: "uatBugs",
  uatSignoffs: "uatSignoffs",
  volunteerApplications: "volunteerApplications",
  volunteerTasks: "volunteerTasks",
  challenges: "challenges",
  challengeSubmissions: "challengeSubmissions",
  sponsorInquiries: "sponsorInquiries",
  sponsorshipOrders: "sponsorshipOrders",
  teamChannels: "teamChannels",
  roleChannels: "roleChannels",
  userChannels: "userChannels",
  pods: "pods",
  podChannels: "podChannels",
  podTasks: "podTasks",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
