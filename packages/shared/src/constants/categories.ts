import type { Category } from "../types/team.js";

/**
 * Real 2026 Umoja Games categories with exact DOB eligibility cutoffs,
 * extracted from project/uploads/umoja13_tournament_app_starter.md.
 * `format` is the on-field roster size; DOB cutoffs feed the AI
 * age-eligibility check during player check-in.
 */
export const CATEGORIES: Category[] = [
  { id: "a71b598a-2b5e-4813-ac41-d610862a12de", label: "Men's Open", format: "9-aside", minPlayersToStart: 6 },
  { id: "06f2f800-563c-4dcc-81a2-25dc1a37e118", label: "Men's 40 & Over", format: "9-aside", minPlayersToStart: 6 },
  { id: "47a3146e-892b-4b8f-bb3e-aa9558ed15e1", label: "Men's 30 & Over", format: "9-aside", minPlayersToStart: 6 },
  { id: "bbcfb06e-26e6-439d-b38e-c7054786fe55", label: "Boy's 17 & Under", format: "7-aside", minPlayersToStart: 5 },
  { id: "8df13d41-9f74-44c6-88fe-acaa9f3d7cf0", label: "Boy's 14 & Under", format: "7-aside", minPlayersToStart: 5 },
  { id: "21a84945-3ceb-44f1-a409-5721a23d5264", label: "Boy's 12 & Under", format: "7-aside", minPlayersToStart: 5 },
  { id: "9147c9c5-2446-452b-8047-8a78bd9c7860", label: "Boy's 10 & Under", format: "7-aside", minPlayersToStart: 5 },
  { id: "33eef558-de37-4513-81d1-a1181b60778f", label: "Boy's 8 & Under", format: "5-aside", minPlayersToStart: 3 },
  { id: "edc8142f-2ef0-4586-a576-2444875c4167", label: "Women's Open", format: "7-aside", minPlayersToStart: 5 },
  { id: "c2b13374-b84f-45b0-b234-7595d5701de5", label: "Girls 14 & Under", format: "7-aside", minPlayersToStart: 5 },
  { id: "38dcf88a-e524-4de3-9459-4614421fa801", label: "Girls 10 & Under", format: "7-aside", minPlayersToStart: 5 },
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

/** Categories that don't track standings/W-D-L — every player medals, no bracket. */
export const FESTIVAL_CATEGORY_IDS = ["33eef558-de37-4513-81d1-a1181b60778f"]; // Boy's 8 & Under

/** Non-match tournament-wide calendar entries (not Games, but shown alongside schedule). */
export const SPECIAL_EVENTS = [
  { id: "all-star-game", label: "All-Star Game", day: "sun", field: "Stadium Field" },
  { id: "awards-ceremony", label: "Awards Ceremony", day: "sun", time: "17:30", field: "Main Stage" },
] as const;

// The venue's own field numbering — not a made-up 1-6 sequence. Umoja Games
// actually plays on fields 5, 9, and 12-17 at Maryland SoccerPlex, plus the
// Stadium Field for marquee matches.
export const FIELDS = ["Field 5", "Field 9", "Field 12", "Field 13", "Field 14", "Field 15", "Field 16", "Field 17", "Stadium Field"] as const;

export const VENUE = {
  name: "Maryland SoccerPlex",
  address: "18031 Central Park Circle, Boyds, MD 20841",
  dates: "August 14-16, 2026",
};
