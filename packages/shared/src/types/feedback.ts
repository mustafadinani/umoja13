export const FEEDBACK_ROLES = ["participant", "fan_family", "vendor_partner", "organizing_team", "volunteer"] as const;
export type FeedbackRole = (typeof FEEDBACK_ROLES)[number];

export const FEEDBACK_ROLE_LABELS: Record<FeedbackRole, string> = {
  participant: "Participant",
  fan_family: "Fan / Family member",
  vendor_partner: "Vendor partner (referees, host venue, others)",
  organizing_team: "Organizing team",
  volunteer: "Volunteer (Umoji)",
};

export const FEEDBACK_RATING_CATEGORIES = [
  "overall",
  "tournament_camp",
  "website_app",
  "awards_ceremony",
  "facility",
  "fun_activities",
  "accommodations",
  "food_vendor",
] as const;
export type FeedbackRatingCategory = (typeof FEEDBACK_RATING_CATEGORIES)[number];

export const FEEDBACK_RATING_CATEGORY_LABELS: Record<FeedbackRatingCategory, string> = {
  overall: "Overall Experience",
  tournament_camp: "Soccer Tournament & Toddler Camp",
  website_app: "Umoja 13 Website/App (incl. registration/check-in/scores)",
  awards_ceremony: "Closing Awards Ceremony",
  facility: "Facility (SoccerPlex)",
  fun_activities: "Fun Activities (scavenger hunt, fun zone, local attractions)",
  accommodations: "Accommodations",
  food_vendor: "Food and Vendor Options",
};

export const FEEDBACK_RATING_VALUES = ["excellent", "good", "neutral", "needs_improvement", "didnt_like_it"] as const;
export type FeedbackRatingValue = (typeof FEEDBACK_RATING_VALUES)[number];

export const FEEDBACK_RATING_VALUE_LABELS: Record<FeedbackRatingValue, string> = {
  excellent: "Excellent",
  good: "Good",
  neutral: "Neutral",
  needs_improvement: "Needs Improvement",
  didnt_like_it: "Didn't Like It",
};

/** Numeric weight for averaging — excellent highest, matching the survey's own left-to-right order. */
export const FEEDBACK_RATING_SCORE: Record<FeedbackRatingValue, number> = {
  excellent: 5,
  good: 4,
  neutral: 3,
  needs_improvement: 2,
  didnt_like_it: 1,
};

export const FEEDBACK_HELP_OPTIONS = ["sponsor", "volunteer", "academy"] as const;
export type FeedbackHelpOption = (typeof FEEDBACK_HELP_OPTIONS)[number];

export const FEEDBACK_HELP_OPTION_LABELS: Record<FeedbackHelpOption, string> = {
  sponsor: "Sponsor Umoja 14",
  volunteer: "Volunteer",
  academy: "Open a local academy",
};

/**
 * One completed "Umoja 13 Feedback" survey response — anonymous by default,
 * name/email are opt-in identification (page 2), never a login requirement.
 * "Make a donation today" is deliberately NOT one of the FeedbackHelpOptions
 * above: it's a real payment with its own lifecycle, so it's handled as its
 * own SponsorshipOrder (see DonateNowModal, createSponsorshipIntent) and
 * just linked back here via donatedOrderId once it succeeds.
 */
export interface FeedbackResponse {
  id: string;
  roles: FeedbackRole[];
  /** Opt-in — the respondent chose to identify themselves. Absent means anonymous. */
  name?: string;
  email?: string;
  ratings: Partial<Record<FeedbackRatingCategory, FeedbackRatingValue>>;
  loved?: string;
  improve?: string;
  helpOptions: FeedbackHelpOption[];
  /** Set once a "Make a donation today" checkout actually succeeds. */
  donatedOrderId?: string;
  donatedAmountCents?: number;
  /** Present only when the respondent was signed in — never required, and never blocks staying anonymous. */
  filedByUid?: string;
  createdAt: number;
}
