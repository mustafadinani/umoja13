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
  { id: "edc8142f-2ef0-4586-a576-2444875c4167", label: "Women's Open", format: "5-aside", minPlayersToStart: 3, teamCount: 4, groupLegs: 1, bracketTemplate: "top4_semis" },
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

/** Non-match tournament-wide calendar entries (not Games, but shown alongside schedule). */
export const SPECIAL_EVENTS = [
  { id: "all-star-game", label: "All-Star Game", day: "sun", field: "Stadium Field" },
  { id: "awards-ceremony", label: "Awards Ceremony", day: "sun", time: "17:30", field: "Main Stage" },
] as const;

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

/** Maps a fine-grained Game field code (e.g. "12B") back to its cluster (e.g. "Field 12"), for Pod/FieldMap lookups that only know about clusters. Falls back to the input unchanged for anything that isn't a numbered sub-pitch (e.g. "Stadium Field"). */
export function fieldCluster(field: string): string {
  const m = /^(\d+)/.exec(field);
  return m ? `Field ${m[1]}` : field;
}

/**
 * Loose schematic layout for the field map — shared by web's SVG rendering
 * and mobile's View-based rendering, so both draw the exact same grid from
 * one source. Coordinates are in a 250x260 unit box; stylized for visual
 * flavor, not a literal to-scale reproduction of the venue.
 */
export const FIELD_BOXES: { label: (typeof FIELDS)[number]; x: number; y: number; w: number; h: number }[] = [
  { label: "Field 5", x: 16, y: 14, w: 66, h: 48 },
  { label: "Field 9", x: 92, y: 14, w: 66, h: 48 },
  { label: "Field 12", x: 168, y: 14, w: 66, h: 48 },
  { label: "Field 13", x: 16, y: 72, w: 66, h: 48 },
  { label: "Field 14", x: 92, y: 72, w: 66, h: 48 },
  { label: "Field 15", x: 168, y: 72, w: 66, h: 48 },
  { label: "Field 16", x: 16, y: 130, w: 66, h: 48 },
  { label: "Field 17", x: 92, y: 130, w: 66, h: 48 },
  { label: "Stadium Field", x: 16, y: 196, w: 218, h: 52 },
];
export const FIELD_MAP_BOX_WIDTH = 250;
export const FIELD_MAP_BOX_HEIGHT = 260;

export const VENUE = {
  name: "Maryland SoccerPlex",
  address: "18031 Central Park Circle, Boyds, MD 20841",
  dates: "August 14-16, 2026",
};
