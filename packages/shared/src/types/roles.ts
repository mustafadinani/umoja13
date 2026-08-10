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

/**
 * Canonical priority for auto-picking someone's primaryRole when they hold
 * more than one — highest first. Playing comes first (a parent/player who
 * also signs up to volunteer should still land on their player dashboard by
 * default), then plain fan, then tournament staff, with volunteer last
 * since it's routinely layered on top of any of the others and should
 * never silently bump someone out of the dashboard they actually want.
 * Used wherever a role change is computed automatically (see
 * reviewVolunteerApplication) — an explicit admin choice via setUserRole is
 * a deliberate override and bypasses this.
 */
export const PRIMARY_ROLE_PRIORITY: Role[] = ["captain", "player", "fan", "commissioner", "referee", "admin", "volunteer"];

/** Picks the highest-priority role present in `roles` per PRIMARY_ROLE_PRIORITY. */
export function pickPrimaryRole(roles: Role[]): Role {
  for (const r of PRIMARY_ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? "fan";
}
