/**
 * Umoja Games 2026 Scavenger Hunt — Official Rules.
 *
 * Required for App Store Guideline 5.3.2 (Gaming, Gambling, and Lotteries):
 * a contest with a prize of value must have official rules available to
 * users at all times in-app, and must explicitly state Apple is not a
 * sponsor. Rendered on both platforms from this one source (web:
 * pages/HuntRules.tsx, mobile: screens/HuntRulesScreen.tsx) so the two
 * never drift — see HuntScreen.tsx (mobile) and Hunt.tsx (web) for the
 * "$500 grand prize / $150 runner-up / gift bags for top 5" copy this
 * formalizes.
 *
 * Bump HUNT_RULES_VERSION whenever the prize structure, dates, or
 * eligibility terms below change materially.
 *
 * This is a good-faith, code-grounded rules document, not a substitute for
 * review by counsel before prizes are actually awarded — get that review
 * before Sunday's ceremony if it hasn't happened yet.
 */
export const HUNT_RULES_VERSION = "2026-08-12";

export const HUNT_RULES_SPONSOR = "Umoja Outreach Foundation";
export const HUNT_RULES_CONTACT_EMAIL = "info@umojaoutreach.org";

export interface HuntRulesSection {
  title: string;
  bullets: string[];
}

export const HUNT_RULES: HuntRulesSection[] = [
  {
    title: "Sponsor",
    bullets: [
      `The Umoja Games 2026 Scavenger Hunt ("the Hunt") is organized by ${HUNT_RULES_SPONSOR} ("Sponsor," "we," "us"), the organizer of the Umoja Games tournament.`,
      "This Hunt is in no way sponsored, endorsed, administered by, or associated with Apple Inc. or Google LLC. Apple and Google bear no responsibility for the Hunt and are not sponsors of it.",
    ],
  },
  {
    title: "Entry period",
    bullets: [
      "The Hunt runs across the Umoja Games 2026 weekend at the Maryland SoccerPlex, 18031 Central Park Circle, Boyds, MD 20841 — Friday, August 14 through Sunday, August 16, 2026.",
      "The exact start/end time each day is set by Sponsor staff in the app and may shift slightly from the schedule above; the current status always shows in the Hunt tab.",
      "Winners are announced and prizes awarded in person at the closing ceremony on Sunday, August 16, 2026. Sponsor may adjust this date/time and will update this page and the app if so.",
    ],
  },
  {
    title: "Eligibility — no purchase necessary",
    bullets: [
      "Open to anyone with a valid Umoja13 app account who is physically present at the Umoja Games 2026 tournament during the entry period above. No purchase, payment, or fee of any kind is required to enter or to win.",
      "Participants form or join a Crew of up to 4 people in the app; a Crew, not an individual, is the unit that earns points and wins a prize.",
      "You can only be part of one Crew at a time.",
      "Sponsor staff, facilitators, and their immediate family members who help administer, review, or judge Hunt submissions are not eligible to win a cash prize.",
      "Void where prohibited by law.",
    ],
  },
  {
    title: "How to enter",
    bullets: [
      "Sign in to the Umoja13 app, form or join a Crew (up to 4 members) from the Hunt tab once the Hunt has opened for the weekend.",
      "Complete missions and challenges shown in the app for points. There are 45 missions across the 3 days, plus surprise bonus challenges Sponsor staff may post at any time during the entry period.",
      "Some missions (trivia, GPS, QR) score automatically; others (photo, video, text, mini-game) are reviewed and scored by a Sponsor facilitator, generally within the entry period. Bonus challenges may carry an early-bird bonus for the first crews to submit, and facilitators may award discretionary bonus points for outstanding submissions.",
      "All photo/video submissions must be your Crew's own, taken during the entry period, and must follow the app's Code of Conduct — Sponsor may disqualify any submission or Crew for cheating, plagiarism, or a Code of Conduct violation.",
    ],
  },
  {
    title: "Winner selection and prizes",
    bullets: [
      "At the end of the entry period, Crews are ranked by total points earned (the in-app leaderboard reflects this in real time, though final review of pending submissions may adjust standings before the ceremony).",
      "Grand Prize: $500, awarded to the #1-ranked Crew.",
      "Runner-Up Prize: $150, awarded to the #2-ranked Crew.",
      "Sponsor Gift Bags, awarded to the #3, #4, and #5-ranked Crews.",
      "If two or more Crews are tied for a prize-winning rank at the end of the entry period, Sponsor will first look to whichever tied Crew reached that point total earliest; if still tied, Sponsor will select the winner from among the tied Crews by random drawing.",
      "Odds of winning depend on the number of Crews that enter and the number and difficulty of missions/challenges completed.",
      "A prize is awarded to the winning Crew as a whole; how it's split among Crew members is entirely up to the Crew. At least one member of a winning Crew must be present at the closing ceremony (or send someone to claim on the Crew's behalf) to receive the prize — a prize unclaimed at the ceremony may be forfeited and, at Sponsor's discretion, awarded to the next-ranked eligible Crew.",
      "Winners are solely responsible for any taxes owed on a prize they receive.",
    ],
  },
  {
    title: "General conditions",
    bullets: [
      "By participating, you agree to release and hold harmless Sponsor, the Maryland SoccerPlex, and each of their officers, staff, and volunteers from any claims or liability arising from your participation in the Hunt or acceptance/use of a prize.",
      "Sponsor may disqualify any participant or Crew it reasonably believes has cheated, tampered with entry, or violated these rules or the tournament's Code of Conduct.",
      "Sponsor reserves the right to modify, suspend, or cancel the Hunt, or any part of it, at its discretion, including for reasons of safety or events outside Sponsor's control — Sponsor will update this page if that happens.",
      "By participating and, if a winner, accepting a prize, you consent to Sponsor's use of your name, likeness, and Crew's submissions for promotional purposes related to the Umoja Games, without additional compensation, except where prohibited by law.",
      "These rules are governed by the laws of the State of Maryland, USA.",
    ],
  },
  {
    title: "Questions",
    bullets: [
      `Contact Sponsor at ${HUNT_RULES_CONTACT_EMAIL} with any question about these rules or the Hunt.`,
      "These official rules are available at all times from the Hunt tab in the app.",
    ],
  },
];
