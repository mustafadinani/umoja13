import type { Category } from "../types/team.js";

/**
 * Real 2026 Umoja Games categories with exact DOB eligibility cutoffs,
 * extracted from project/uploads/umoja13_tournament_app_starter.md.
 * `format` is the on-field roster size; DOB cutoffs feed the AI
 * age-eligibility check during player check-in.
 */
export const CATEGORIES: Category[] = [
  { id: "mens-open", label: "Men's Open", format: "9-aside", minPlayersToStart: 6 },
  { id: "mens-over-40", label: "Men's Over 40", format: "9-aside", minPlayersToStart: 6 },
  { id: "mens-over-30", label: "Men's Over 30", format: "9-aside", minPlayersToStart: 6 },
  { id: "boys-20u", label: "Boys 20U", format: "7-aside", minPlayersToStart: 5 },
  { id: "boys-17u", label: "Boys 17U", format: "7-aside", minPlayersToStart: 5 },
  { id: "boys-14u", label: "Boys 14U", format: "7-aside", minPlayersToStart: 5 },
  { id: "boys-12u", label: "Boys 12U", format: "7-aside", minPlayersToStart: 5 },
  { id: "boys-10u", label: "Boys 10U", format: "7-aside", minPlayersToStart: 5 },
  { id: "boys-8u", label: "Boys 8U", format: "5-aside", minPlayersToStart: 3 },
  { id: "womens-open", label: "Women's Open", format: "7-aside", minPlayersToStart: 5 },
  { id: "girls-14u", label: "Girls 14U", format: "7-aside", minPlayersToStart: 5 },
  { id: "girls-11u", label: "Girls 11U", format: "7-aside", minPlayersToStart: 5 },
  { id: "girls-8u", label: "Girls 8U", format: "5-aside", minPlayersToStart: 3 },
];

/** Age-eligibility DOB cutoff per category — "born on/after" this date qualifies. Undefined = no age restriction (Open categories). */
export const CATEGORY_DOB_CUTOFF: Record<string, string | undefined> = {
  "mens-open": undefined,
  "mens-over-40": "1986-12-31", // 40+ or turning 40 in 2026 -> born on/before this date
  "mens-over-30": "1996-12-31", // 30+ or turning 30 in 2026
  "boys-20u": "2006-01-01",
  "boys-17u": "2009-01-01",
  "boys-14u": "2012-01-01",
  "boys-12u": "2014-01-01",
  "boys-10u": "2016-01-01",
  "boys-8u": "2018-01-01",
  "womens-open": undefined,
  "girls-14u": "2012-01-01",
  "girls-11u": "2015-01-01",
  "girls-8u": "2018-01-01",
};

/** "Over" categories check born-on-or-before; "Under" categories check born-on-or-after. */
export const OVER_AGE_CATEGORY_IDS = ["mens-over-40", "mens-over-30"];

/** Non-competitive: Umoja Soccer Camp (age 6 & under as of Jan 1 2026) — not a tournament category, no games/standings. */
export const SOCCER_CAMP = { id: "soccer-camp", label: "Umoja Soccer Camp", dobCutoff: "2020-01-01" };

/** Categories that don't track standings/W-D-L — every player medals, no bracket. */
export const FESTIVAL_CATEGORY_IDS = ["boys-8u", "girls-8u"];

/** Non-match tournament-wide calendar entries (not Games, but shown alongside schedule). */
export const SPECIAL_EVENTS = [
  { id: "all-star-game", label: "All-Star Game", day: "sun", field: "Stadium Field" },
  { id: "awards-ceremony", label: "Awards Ceremony", day: "sun", time: "17:30", field: "Main Stage" },
] as const;

export const FIELDS = ["Field 1", "Field 2", "Field 3", "Field 4", "Field 5", "Field 6", "Stadium Field"] as const;

export const VENUE = {
  name: "Maryland SoccerPlex",
  address: "18031 Central Park Circle, Boyds, MD 20841",
  dates: "August 14-16, 2026",
};
