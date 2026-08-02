/**
 * Dual-Firestore data layout for the Umoja Games client.
 *
 * Authentication is always Firebase Auth (project-level). Profile docs and
 * tournament data are split across two Firestore databases in that project.
 */
export const DATA_SOURCES = {
  /** Named DB: games, moments, hunt, notifications, channels, seed/test users, etc. */
  app: {
    databaseId: "umoja13-app",
    usersCollection: "users",
  },
  /** Default DB: registration teams/players + Outreach user profiles. */
  registration: {
    databaseId: "(default)",
    profilesCollection: "profiles",
    familyCollection: "families",
    teamsPath: ["uGames", "2026", "teamsRegistered"] as const,
    playersPath: ["uGames", "2026", "playersRegistered"] as const,
  },
} as const;

export type ProfileSource = "umoja13" | "default";
