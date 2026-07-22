export const ROLES = [
  "fan",
  "player",
  "captain",
  "volunteer",
  "referee",
  "commissioner",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Captain is a superset of player (same dashboard + captain tools).
 * Commissioner and admin both see all games/categories; commissioner
 * additionally owns finalize/moderation workflows.
 */
export function roleIncludesPlayerDashboard(role: Role): boolean {
  return role === "player" || role === "captain";
}

export function roleSeesAllGames(role: Role): boolean {
  return role === "fan" || role === "commissioner" || role === "admin" || role === "player" || role === "captain";
}
