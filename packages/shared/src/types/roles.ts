export const ROLES = [
  "fan",
  "player",
  "captain",
  "coach_manager",
  "volunteer",
  "referee",
  "commissioner",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Captain and coach/manager are both a superset of player (same dashboard +
 * captain tools) — a coach/manager isn't necessarily a registered player
 * themselves, but they get the same jersey-editing/complaint tools for
 * whichever team(s) an admin has attached them to (Team.coachManagerUids;
 * see setJerseyNumber and PlayerDashboard/HomeScreen's "managed teams"
 * section). Commissioner and admin both see all games/categories;
 * commissioner additionally owns finalize/moderation workflows.
 */
export function roleIncludesPlayerDashboard(role: Role): boolean {
  return role === "player" || role === "captain" || role === "coach_manager";
}

export function roleSeesAllGames(role: Role): boolean {
  return (
    role === "fan" ||
    role === "commissioner" ||
    role === "admin" ||
    role === "player" ||
    role === "captain" ||
    role === "coach_manager"
  );
}

/**
 * Canonical priority for auto-picking someone's primaryRole when they hold
 * more than one — highest first. Playing comes first (a parent/player who
 * also signs up to volunteer should still land on their player dashboard by
 * default), then tournament staff, then volunteer, with fan dead last —
 * "fan" is the default everyone starts with (see AuthProvider.signUp), so
 * holding ANY other role should always trump it; someone with roles
 * ["fan", "admin"] should land on the Admin dashboard, not Fan. Used
 * wherever a role change is computed automatically (see
 * reviewVolunteerApplication, mapOutreachProfileToUserProfile) — an
 * explicit admin choice via setUserRole, or someone using the "VIEWING AS"
 * switcher to deliberately pick Fan, is a deliberate override and bypasses
 * this (those write primaryRole directly, they don't call this function).
 */
export const PRIMARY_ROLE_PRIORITY: Role[] = ["captain", "coach_manager", "player", "commissioner", "referee", "admin", "volunteer", "fan"];

/** Picks the highest-priority role present in `roles` per PRIMARY_ROLE_PRIORITY. */
export function pickPrimaryRole(roles: Role[]): Role {
  for (const r of PRIMARY_ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? "fan";
}
