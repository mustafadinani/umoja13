import type { Category } from "../types/team.js";

/**
 * Real 2026 Umoja Games categories. Core identity/DOB fields extracted from
 * project/uploads/umoja13_tournament_app_starter.md; `format` is the on-field
 * roster size (DOB cutoffs feed the AI age-eligibility check during player
 * check-in). `teamCount`/`groupLegs`/`bracketTemplate` are from the official
 * "Umoja13 Schedule & Format Guide" PDF (Aug 2026) — see
 * constants/bracketTemplates.ts for what each bracketTemplate actually plays
 * out to. NOTE: that guide has Women's Open, Girls 14 & Under, and Girls 10 &
 * Under all playing 5v5 (field 5A/5B) — corrected here from a prior
 * `7-aside` that predates the format guide.
 */
export const CATEGORIES: Category[] = [
  { id: "a71b598a-2b5e-4813-ac41-d610862a12de", label: "Men's Open", format: "9-aside", minPlayersToStart: 3, teamCount: 16, groupLegs: 1, bracketTemplate: "dual_bracket_16" },
  { id: "06f2f800-563c-4dcc-81a2-25dc1a37e118", label: "Men's 40 & Over", format: "9-aside", minPlayersToStart: 3, teamCount: 3, groupLegs: 2, bracketTemplate: "seed1_bye_playin" },
  { id: "47a3146e-892b-4b8f-bb3e-aa9558ed15e1", label: "Men's 30 & Over", format: "9-aside", minPlayersToStart: 3, teamCount: 8, groupLegs: 1, bracketTemplate: "quarterfinal8" },
  { id: "bbcfb06e-26e6-439d-b38e-c7054786fe55", label: "Boy's 17 & Under", format: "7-aside", minPlayersToStart: 3, teamCount: 5, groupLegs: 1, bracketTemplate: "seed3_wildcard" },
  { id: "8df13d41-9f74-44c6-88fe-acaa9f3d7cf0", label: "Boy's 14 & Under", format: "7-aside", minPlayersToStart: 3, teamCount: 6, groupLegs: 1, bracketTemplate: "top4_semis" },
  { id: "21a84945-3ceb-44f1-a409-5721a23d5264", label: "Boy's 12 & Under", format: "7-aside", minPlayersToStart: 3, teamCount: 8, groupLegs: 1, bracketTemplate: "quarterfinal8" },
  { id: "9147c9c5-2446-452b-8047-8a78bd9c7860", label: "Boy's 10 & Under", format: "7-aside", minPlayersToStart: 3, teamCount: 5, groupLegs: 1, bracketTemplate: "seed3_wildcard" },
  { id: "33eef558-de37-4513-81d1-a1181b60778f", label: "Boy's 8 & Under", format: "5-aside", minPlayersToStart: 3, teamCount: 6, groupLegs: 1, bracketTemplate: "top4_semis" },
  { id: "edc8142f-2ef0-4586-a576-2444875c4167", label: "Women's Open", format: "5-aside", minPlayersToStart: 3, teamCount: 4, groupLegs: 2, bracketTemplate: "top2_bottom2" },
  { id: "c2b13374-b84f-45b0-b234-7595d5701de5", label: "Girls 14 & Under", format: "5-aside", minPlayersToStart: 3, teamCount: 5, groupLegs: 1, bracketTemplate: "seed3_wildcard" },
  { id: "38dcf88a-e524-4de3-9459-4614421fa801", label: "Girls 10 & Under", format: "5-aside", minPlayersToStart: 3, teamCount: 4, groupLegs: 2, bracketTemplate: "top2_bottom2" },
];

/** Age-eligibility DOB cutoff per category — "born on/after" this date qualifies. Undefined = no age restriction (Open categories). Not currently read anywhere — age eligibility is confirmed by staff during manual check-in review, not computed automatically. */
export const CATEGORY_DOB_CUTOFF: Record<string, string | undefined> = {
  "a71b598a-2b5e-4813-ac41-d610862a12de": undefined, // Men's Open
  "06f2f800-563c-4dcc-81a2-25dc1a37e118": "1986-12-31", // Men's 40 & Over -> 40+ or turning 40 in 2026
  "47a3146e-892b-4b8f-bb3e-aa9558ed15e1": "1996-12-31", // Men's 30 & Over -> 30+ or turning 30 in 2026
  "bbcfb06e-26e6-439d-b38e-c7054786fe55": "2009-01-01", // Boy's 17 & Under
  "8df13d41-9f74-44c6-88fe-acaa9f3d7cf0": "2012-01-01", // Boy's 14 & Under
  "21a84945-3ceb-44f1-a409-5721a23d5264": "2014-01-01", // Boy's 12 & Under
  "9147c9c5-2446-452b-8047-8a78bd9c7860": "2016-01-01", // Boy's 10 & Under
  "33eef558-de37-4513-81d1-a1181b60778f": "2018-01-01", // Boy's 8 & Under
  "edc8142f-2ef0-4586-a576-2444875c4167": undefined, // Women's Open
  "c2b13374-b84f-45b0-b234-7595d5701de5": "2012-01-01", // Girls 14 & Under
  "38dcf88a-e524-4de3-9459-4614421fa801": "2016-01-01", // Girls 10 & Under
};

/** "Over" categories check born-on-or-before; "Under" categories check born-on-or-after. */
export const OVER_AGE_CATEGORY_IDS = [
  "06f2f800-563c-4dcc-81a2-25dc1a37e118", // Men's 40 & Over
  "47a3146e-892b-4b8f-bb3e-aa9558ed15e1", // Men's 30 & Over
];

/** Non-competitive: Umoja Soccer Camp (age 6 & under as of Jan 1 2026) — not a tournament category, no games/standings. */
export const SOCCER_CAMP = { id: "soccer-camp", label: "Umoja Soccer Camp", dobCutoff: "2020-01-01" };

/** The tournament's calendar year — "turning 40 in 2026"/"as of Jan 1, 2026" phrasing below is relative to this, not baked in as a literal string per category. */
export const TOURNAMENT_YEAR = 2026;

/**
 * Human-readable version of a category's CATEGORY_DOB_CUTOFF, in the same
 * phrasing staff actually use when checking a player's age against their ID
 * during manual check-in review ("Born on or after Jan 1, 2012" / "Age 40+
 * (or turning 40 in 2026)") rather than a bare ISO date.
 */
export function ageEligibilityLabel(categoryId: string): string {
  const cutoff = CATEGORY_DOB_CUTOFF[categoryId];
  if (!cutoff) return "No age restriction";
  const cutoffYear = Number(cutoff.slice(0, 4));
  if (OVER_AGE_CATEGORY_IDS.includes(categoryId)) {
    const age = TOURNAMENT_YEAR - cutoffYear;
    return `Age ${age}+ (or turning ${age} in ${TOURNAMENT_YEAR})`;
  }
  return `Born on or after Jan 1, ${cutoffYear}`;
}

/** "9-aside" -> "9v9" — the shorthand everyone (staff, players) actually recognizes over the internal `format` value. */
export function formatVersusLabel(format: Category["format"]): string {
  const n = format.split("-")[0];
  return `${n}v${n}`;
}

/**
 * Full eligibility reference — category, format, age restriction — for
 * staff reviewing check-ins. Umoja Soccer Camp isn't a real CATEGORIES
 * entry (see SOCCER_CAMP; no games/standings/roster) but belongs on the
 * same reference table admins need it on, since it's a real check-in-able
 * registration with its own age cutoff.
 */
export const CATEGORY_ELIGIBILITY_TABLE: { label: string; format: string; ageRestriction: string }[] = [
  ...CATEGORIES.map((c) => ({ label: c.label, format: formatVersusLabel(c.format), ageRestriction: ageEligibilityLabel(c.id) })),
  {
    label: SOCCER_CAMP.label,
    format: "Training camp",
    ageRestriction: `Age ${TOURNAMENT_YEAR - Number(SOCCER_CAMP.dobCutoff.slice(0, 4))} & under (as of Jan 1, ${TOURNAMENT_YEAR})`,
  },
];

/**
 * Real registration categoryIds for the Toddlers Camp age brackets — these
 * are the actual ids stamped on registration rows (distinct from the
 * synthetic `SOCCER_CAMP.id` above, which nothing in registration data
 * actually uses). Not real tournament divisions: no games, no standings,
 * and — same as camp generally — never expected to have a team assigned.
 * Kept here so admin views can show a real label instead of the bare
 * categoryId and skip flagging these registrants as an error.
 */
export const TODDLERS_CAMP_CATEGORY_LABELS: Record<string, string> = {
  "b25e6367-4781-4dc6-8b78-cf72b70ea0f0": "Toddlers Camp (Ages 3 and 4)",
  "fb4454dc-d4d3-464c-a4df-d0942c19c9fe": "Toddlers Camp (Ages 5 and 6)",
};

/**
 * Resolve a categoryId to a display label everywhere a raw CATEGORIES.find()
 * would otherwise come up empty for a legitimate non-competitive (Toddlers
 * Camp) registration — one canonical fallback instead of every call site
 * reimplementing the same "or check TODDLERS_CAMP_CATEGORY_LABELS" logic.
 * Falls back to the bare id only for a genuinely unmapped categoryId.
 */
export function categoryLabelFor(categoryId: string | undefined): string {
  if (!categoryId) return "";
  return CATEGORIES.find((c) => c.id === categoryId)?.label ?? TODDLERS_CAMP_CATEGORY_LABELS[categoryId] ?? categoryId;
}

/** True for a Toddlers Camp categoryId — no games/standings/team, but a real, checkin-able registration. */
export function isNonCompetitiveCategory(categoryId: string | undefined): boolean {
  return !!categoryId && categoryId in TODDLERS_CAMP_CATEGORY_LABELS;
}

/**
 * Categories that don't track standings/W-D-L — every player medals, no bracket.
 * Empty as of the Aug 2026 Schedule & Format Guide: that guide gives Boy's 8 &
 * Under (the one division previously flagged here) a fully competitive bracket
 * (6-team round robin -> seeded Semi-Finals -> Cup/Shield Final), same shape as
 * Boy's 14 & Under and Women's Open — it's no longer a no-standings festival
 * division. Kept as a real (empty) list rather than removed outright since the
 * standings/draw/stats code paths already branch on it.
 */
export const FESTIVAL_CATEGORY_IDS: string[] = [];

/** Categories asked, during check-in, whether they'd like their games scheduled on the private field. */
export const PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS = [
  "c2b13374-b84f-45b0-b234-7595d5701de5", // Girls 14 & Under
  "edc8142f-2ef0-4586-a576-2444875c4167", // Women's Open
];

/** Aug 14 2026 00:00 America/New_York — once check-in/jersey numbers are locked for the tournament. */
export const TOURNAMENT_START_AT = new Date("2026-08-14T00:00:00-04:00").getTime();

/**
 * Display-only — the date shown on the Hunt's "coming soon" page. The
 * actual gate is the admin-controlled `config/hunt.started` flag (see
 * types/huntConfig.ts), not this date; staff flip that switch whenever
 * they're ready, which may or may not be exactly this day.
 */
export const HUNT_LAUNCH_LABEL = "August 13";

/** Actual calendar date per tournament day — "Fri"/"Sat"/"Sun" alone doesn't say which Friday, so anywhere a bare day abbreviation is shown to a user should pair it with this. */
export const TOURNAMENT_DAY_DATES: Record<"fri" | "sat" | "sun", string> = {
  fri: "Aug 14",
  sat: "Aug 15",
  sun: "Aug 16",
};

/** Non-match tournament-wide calendar entries (not Games, but shown alongside schedule). */
export const SPECIAL_EVENTS = [
  { id: "awards-ceremony", label: "Umoja Family Awards Ceremony", day: "sun", time: "19:00", field: "Indoor arena" },
] as const;

export interface ToddlerCampSession {
  id: string;
  day: "fri" | "sat" | "sun";
  /** 24-hour "HH:MM", same convention as Game.kickoffTime — lets camp sessions sort/format alongside real games in one merged schedule. */
  start: string;
  /** Absent for a single point-in-time entry (the Sunday exhibition/walkout) rather than a session with a duration. */
  end?: string;
  location: string;
  group: "Ages 3 & 4" | "Ages 5 & 6" | "All ages";
  activity: string;
  /** The Sunday walkout on the Men's Cup Final field — called out distinctly wherever this schedule renders. */
  highlight?: boolean;
}

/**
 * The two camp-only locations sessions below are held at — not real
 * tournament sub-pitches (see GAME_FIELDS), so they're kept as their own
 * list rather than folded into FIELDS/GAME_FIELDS, but still offered as real
 * choices anywhere a schedule's field filter is built.
 */
export const TODDLER_CAMP_FIELDS = ["Field 12 Camp", "Indoor arena"] as const;

/**
 * Umoja Soccer Camp (Toddlers, ages 3-6) session schedule — from the real
 * "Umoja13 Toddler Camp Preliminary Schedule" (Rev 07.08.2026) PDF. Baked
 * directly into the master Game Day schedule (merged and sorted alongside
 * real Games by day/time — see compareScheduleRows) rather than shown as a
 * separate section, even though camp has no backing `Game` docs (it's
 * non-competitive — see TODDLERS_CAMP_CATEGORY_LABELS).
 */
export const TODDLER_CAMP_SCHEDULE: ToddlerCampSession[] = [
  // Friday
  { id: "camp-fri-1", day: "fri", start: "10:00", end: "10:50", location: "Field 12 Camp", group: "Ages 3 & 4", activity: "Soccer training" },
  { id: "camp-fri-2", day: "fri", start: "11:00", end: "12:15", location: "Field 12 Camp", group: "Ages 5 & 6", activity: "Soccer training" },
  { id: "camp-fri-3", day: "fri", start: "14:00", end: "14:50", location: "Field 12 Camp", group: "Ages 3 & 4", activity: "Soccer training" },
  { id: "camp-fri-4", day: "fri", start: "15:00", end: "16:00", location: "Field 12 Camp", group: "Ages 5 & 6", activity: "Soccer training" },
  { id: "camp-fri-5", day: "fri", start: "16:15", end: "17:15", location: "Field 12 Camp", group: "All ages", activity: "Fun activities" },
  // Saturday
  { id: "camp-sat-1", day: "sat", start: "10:00", end: "10:50", location: "Indoor arena", group: "Ages 3 & 4", activity: "Soccer training" },
  { id: "camp-sat-2", day: "sat", start: "11:00", end: "12:15", location: "Indoor arena", group: "Ages 5 & 6", activity: "Soccer training" },
  { id: "camp-sat-3", day: "sat", start: "14:00", end: "14:50", location: "Indoor arena", group: "Ages 3 & 4", activity: "Soccer training" },
  { id: "camp-sat-4", day: "sat", start: "15:00", end: "16:00", location: "Indoor arena", group: "Ages 5 & 6", activity: "Soccer training" },
  { id: "camp-sat-5", day: "sat", start: "16:15", end: "17:15", location: "Indoor arena", group: "All ages", activity: "Fun activities" },
  // Sunday
  { id: "camp-sun-1", day: "sun", start: "10:00", end: "10:50", location: "Indoor arena", group: "Ages 3 & 4", activity: "Soccer training" },
  { id: "camp-sun-2", day: "sun", start: "11:00", end: "12:15", location: "Indoor arena", group: "Ages 5 & 6", activity: "Soccer training" },
  { id: "camp-sun-3", day: "sun", start: "15:00", end: "16:00", location: "Indoor arena", group: "All ages", activity: "Soccer training" },
  { id: "camp-sun-4", day: "sun", start: "17:00", location: "Men's Cup Final field", group: "All ages", activity: "Exhibition game & walk out on field", highlight: true },
];

export const TODDLER_CAMP_NOTE = "Coaches may make adjustments to groups and sessions based on skill, age, and development — their decision is final.";
export const TODDLER_CAMP_HIGHLIGHT_NOTE = "Cameras ready! Families, please have your players at the field 15 minutes early.";

// The venue's own field numbering — not a made-up 1-6 sequence. Umoja Games
// actually plays on fields 5, 9, and 12-17 at Maryland SoccerPlex, plus the
// Stadium Field for marquee matches. This is the coarse cluster-level list —
// used by Pods/FieldMap, which organize by physical field, not by sub-pitch.
export const FIELDS = ["Field 5", "Field 9", "Field 12", "Field 13", "Field 14", "Field 15", "Field 16", "Field 17", "Stadium Field"] as const;

/**
 * Fine-grained sub-pitch codes actual Games are scheduled on, per the Aug
 * 2026 Schedule & Format Guide — each numbered field cluster above is split
 * into 2-3 concurrent mini-pitches (e.g. Field 5 hosts 5A/5B/5C at once, one
 * per format). 5A is the tournament's single "private" field (see
 * PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS) — that's a property of the field, not
 * encoded into the code itself.
 */
export const GAME_FIELDS = [
  "5A", "5B", "5C",
  "9A", "9B",
  "12A", "12B",
  "13A", "13B",
  "14A", "14B",
  "15A", "15B",
  "16A", "16B",
  "17A", "17B",
] as const;

export const PRIVATE_GAME_FIELD = "5A";

/** Maps a fine-grained Game field code (e.g. "12B") back to its cluster (e.g. "Field 12"), for Pod lookups that only know about clusters. Falls back to the input unchanged for anything that isn't a numbered sub-pitch (e.g. "Stadium Field"). */
export function fieldCluster(field: string): string {
  const m = /^(\d+)/.exec(field);
  return m ? `Field ${m[1]}` : field;
}

/** The Field Map's actual grouping — each numbered field cluster alongside the sub-pitch codes Games are really scheduled on, in field-number order. */
export const FIELD_CLUSTERS: { cluster: string; pitches: readonly string[] }[] = [
  { cluster: "Field 5", pitches: ["5A", "5B", "5C"] },
  { cluster: "Field 9", pitches: ["9A", "9B"] },
  { cluster: "Field 12", pitches: ["12A", "12B"] },
  { cluster: "Field 13", pitches: ["13A", "13B"] },
  { cluster: "Field 14", pitches: ["14A", "14B"] },
  { cluster: "Field 15", pitches: ["15A", "15B"] },
  { cluster: "Field 16", pitches: ["16A", "16B"] },
  { cluster: "Field 17", pitches: ["17A", "17B"] },
];

export const VENUE = {
  name: "Maryland SoccerPlex",
  address: "18031 Central Park Circle, Boyds, MD 20841",
  dates: "August 14-16, 2026",
};
