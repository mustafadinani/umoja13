import { CATEGORIES } from "../constants/categories.js";
import { SELF_REGISTERED_STATUS, type RegisteredPlayer, type RegisteredTeam } from "../types/registration.js";
import type { Category, RosterEntry, Team, TeamStats } from "../types/team.js";
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

/**
 * Collapse registration / Outreach category wording onto a stable key so
 * variants like "Boys 12U", "Boy's 12 & Under", "Men's 40+", "Mens 40 and Over"
 * match the canonical category labels used by Standings pills.
 */
export function categoryMatchKey(label: string): string {
  let t = label.trim().toLowerCase().replace(/[''`′]/g, "");
  t = t.replace(/\+/g, " plus ");
  t = t.replace(/&/g, " and ");
  t = t.replace(/(\d+)\s*u\b/g, "$1 under");
  t = t.replace(/(\d+)\s*plus\b/g, "$1 over");
  t = t.replace(/\band\b/g, " ");
  t = t.replace(/\bboys\b/g, "boy").replace(/\bgirls\b/g, "girl").replace(/\bmens\b/g, "men").replace(/\bwomens\b/g, "women");
  t = t.replace(/[^a-z0-9]+/g, "");
  t = t.replace(/^(\d+)(under|over)(boy|girl|men|women)$/, "$3$1$2");
  return t;
}

/**
 * Map a registration category string onto a catalog id.
 * Pass the live `umoja13-app/categories` list when available so Standings
 * filter pills and team.categoryId share the same id space.
 */
export function resolveCategoryId(
  registrationCategory: string | undefined,
  catalog: readonly Category[] = CATEGORIES
): string {
  if (!registrationCategory?.trim()) return "";
  const list = catalog.length > 0 ? catalog : CATEGORIES;
  const raw = registrationCategory.trim();

  const byId = list.find((c) => c.id === raw);
  if (byId) return byId.id;

  const needle = normalizeCategoryLabel(raw);
  const exact = list.find((c) => normalizeCategoryLabel(c.label) === needle);
  if (exact) return exact.id;

  const needleKey = categoryMatchKey(raw);
  const loose = list.find((c) => categoryMatchKey(c.label) === needleKey);
  if (loose) return loose.id;

  return raw;
}

/** Prefer an explicit categoryId on the registration row, else map from the label. */
export function resolvePlayerCategoryId(
  player: Pick<RegisteredPlayer, "category" | "categoryId">,
  catalog: readonly Category[] = CATEGORIES
): string {
  const list = catalog.length > 0 ? catalog : CATEGORIES;
  const id = player.categoryId?.trim();
  if (id && list.some((c) => c.id === id)) return id;
  if (id) {
    const fromLabel = resolveCategoryId(player.category, list);
    if (list.some((c) => c.id === fromLabel)) return fromLabel;
    return id;
  }
  return resolveCategoryId(player.category, list);
}

/** Prefer team.categoryId when set; else map team.category label. */
export function resolveTeamCategoryId(
  team: Pick<RegisteredTeam, "category" | "categoryId">,
  catalog: readonly Category[] = CATEGORIES
): string {
  const list = catalog.length > 0 ? catalog : CATEGORIES;
  const id = team.categoryId?.trim();
  if (id && list.some((c) => c.id === id)) return id;
  if (id) {
    const fromLabel = resolveCategoryId(team.category, list);
    if (list.some((c) => c.id === fromLabel)) return fromLabel;
    return id;
  }
  return resolveCategoryId(team.category, list);
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

function parseGroup(value: unknown): Team["group"] | undefined {
  if (value === "A" || value === "B") return value;
  if (typeof value === "string") {
    const g = value.trim().toUpperCase();
    if (g === "A" || g === "B") return g;
  }
  return undefined;
}

/**
 * Default photo precedence: whatever selfie the player submitted at
 * check-in wins over the old signup/registration photo as soon as it
 * exists, regardless of review status — it's a current photo of the
 * actual kid, where the registration photo can be months old or (for
 * some rows) a parent's photo. An admin can still explicitly override
 * this from the check-in review screen, in which case that choice always
 * wins.
 */
function resolveCardPhotoUrl(
  realCheckIn: Pick<RosterCheckIn, "selfieUrl" | "cardPhotoOverride"> | undefined,
  registrationPhotoUrl: string | undefined
): string | undefined {
  if (realCheckIn?.cardPhotoOverride === "registration") return registrationPhotoUrl ?? undefined;
  return realCheckIn?.selfieUrl ?? registrationPhotoUrl ?? undefined;
}

export function registeredPlayerToRosterEntry(
  player: RegisteredPlayer,
  captainProfileId?: string,
  realCheckIn?: Pick<RosterCheckIn, "status" | "selfieUrl" | "jerseyNumber" | "lineOfWork" | "currentEmployer" | "cardPhotoOverride">
): RosterEntry {
  const userId = player.uid || player.id;
  return {
    userId,
    // Every sibling on a shared family account has the same userId above —
    // profileId (falling back to this row's own id) is what actually picks
    // out THIS child, matching the same fallback used for
    // PlayerMembership.profileId in mapOutreachProfileToUserProfile.
    playerKey: player.profileId?.trim() || player.id,
    displayName: `${player.firstName} ${player.lastName}`.trim() || "Player",
    jerseyNumber: realCheckIn?.jerseyNumber,
    isCaptain: !!(captainProfileId && (player.uid === captainProfileId || player.id === captainProfileId)),
    checkInStatus: realCheckIn?.status ?? checkInStatusFromRegistration(player.status),
    selfieUrl: resolveCardPhotoUrl(realCheckIn, player.profilePicture ?? undefined),
    lineOfWork: realCheckIn?.lineOfWork,
    currentEmployer: realCheckIn?.currentEmployer,
  };
}

function playersForTeam(team: RegisteredTeam, players: RegisteredPlayer[]): RegisteredPlayer[] {
  // Self-registered rows (the now-removed in-app "Join a Team" flow) were
  // never vetted through the real Outreach import — they're not real
  // registrations, so they must never surface on a real roster, in a
  // captain's player count, in Moments tagging, or anywhere else a team's
  // roster gets built from this. They still show up (and can be deleted) in
  // the admin Players tab, which reads the raw registration rows directly
  // rather than going through this function.
  const real = players.filter((p) => p.status !== SELF_REGISTERED_STATUS);
  const byId = real.filter((p) => p.teamId === team.id);
  if (byId.length > 0) return byId;
  const teamName = normalizeCategoryLabel(team.teamName ?? "");
  if (!teamName) return [];
  return real.filter((p) => normalizeCategoryLabel(p.teamName ?? "") === teamName);
}

export function buildTeamFromRegistration(
  team: RegisteredTeam,
  players: RegisteredPlayer[],
  rosterCheckIns: RosterCheckIn[] = [],
  catalog: readonly Category[] = CATEGORIES,
  /** Optional overlay from umoja13-app/teams/{id} (stats, group, coachManagerUids). */
  appTeam?: Pick<Team, "stats" | "group" | "color" | "sponsorId" | "coachManagerUids"> | null
): Team {
  const captainId = team.captainProfileId ?? team.uid;
  // Keyed by playerKey, not the shared account uid — RosterCheckIn.userId
  // actually holds each player's playerKey (see checkin.ts), so two
  // siblings' check-ins never collide onto the same roster row here.
  const checkInByUserId = new Map(
    rosterCheckIns.filter((r) => r.teamId === team.id).map((r) => [r.userId, r])
  );
  const roster = playersForTeam(team, players).map((p) =>
    registeredPlayerToRosterEntry(p, captainId, checkInByUserId.get(p.profileId?.trim() || p.id))
  );

  if (captainId) {
    for (const entry of roster) {
      if (entry.userId === captainId) entry.isCaptain = true;
    }
  }

  const group = appTeam?.group ?? parseGroup((team as RegisteredTeam & { group?: unknown }).group);

  return {
    id: team.id,
    name: team.teamName?.trim() || "Untitled team",
    categoryId: resolveTeamCategoryId(team, catalog),
    color: appTeam?.color || colorForTeamId(team.id),
    group,
    sponsorId: appTeam?.sponsorId,
    captainUserId: captainId,
    coachManagerUids: appTeam?.coachManagerUids ?? [],
    roster,
    rosterUids: roster.map((r) => r.userId),
    stats: appTeam?.stats ? { ...appTeam.stats } : { ...EMPTY_STATS },
  };
}

export function buildTeamsFromRegistration(
  teams: RegisteredTeam[],
  players: RegisteredPlayer[],
  categoryId?: string,
  rosterCheckIns: RosterCheckIn[] = [],
  catalog: readonly Category[] = CATEGORIES,
  appTeamsById: Map<string, Pick<Team, "stats" | "group" | "color" | "sponsorId" | "coachManagerUids">> = new Map()
): Team[] {
  const mapped = teams.map((t) =>
    buildTeamFromRegistration(t, players, rosterCheckIns, catalog, appTeamsById.get(t.id))
  );
  if (!categoryId) return mapped;
  return mapped.filter((t) => t.categoryId === categoryId);
}

export interface RegistrationCategoryBucket {
  id: string;
  label: string;
  count: number;
  /** True when id matched a tournament category doc/constant. */
  matched: boolean;
}

/**
 * Category pills shared by Admin Teams + Standings: one oval per distinct
 * resolved registration category, with team counts. Unmapped Outreach labels
 * still appear (matched=false) so staff can see and fix them.
 */
export function buildRegistrationCategoryBuckets(
  teams: RegisteredTeam[],
  catalog: readonly Category[] = CATEGORIES
): RegistrationCategoryBucket[] {
  const list = catalog.length > 0 ? catalog : CATEGORIES;
  const labelById = new Map(list.map((c) => [c.id, c.label]));
  const knownIds = new Set(list.map((c) => c.id));
  const counts = new Map<string, RegistrationCategoryBucket>();

  for (const t of teams) {
    const id = resolveTeamCategoryId(t, list);
    if (!id) continue;
    const matched = knownIds.has(id);
    const label = labelById.get(id) ?? t.category?.trim() ?? id;
    const prev = counts.get(id);
    if (prev) prev.count += 1;
    else counts.set(id, { id, label, count: 1, matched });
  }

  return [...counts.values()].sort((a, b) => {
    // Known tournament categories first (canonical order), then unmapped alpha.
    const ai = list.findIndex((c) => c.id === a.id);
    const bi = list.findIndex((c) => c.id === b.id);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.label.localeCompare(b.label);
  });
}
