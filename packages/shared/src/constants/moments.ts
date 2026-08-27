/** Caps Moment.comment — a raw client-side Firestore write (see moments.ts's `allow create` rule, which never checked length), so an unbounded string here has broken rendering on the feed before. Enforced both client-side (input maxLength, cheaper UX) and here for the rules check. */
export const MOMENT_COMMENT_MAX_LENGTH = 280;

export const MOMENT_TAGS = [
  "Goal",
  "Save",
  "Skill move",
  "Celebration",
  "Fan moment",
  "Team entrance",
  "Referee moment",
  "Funny moment",
  "Community",
] as const;

export const AWARD_NAMES = [
  "Player of the Match",
  "Team of the Day",
  "Goal of the Tournament",
  "Best Save",
  "Best Celebration",
  "Best Sportsmanship",
  "Rising Star",
  "Fan Favorite",
  "Community Hero",
  "Best Team Entrance",
  "Best Dressed Fan",
] as const;
