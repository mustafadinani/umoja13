/**
 * Umoja Games 2026 official Rules & Regulations — condensed from the
 * published rules document, for the Ask Umoja system prompt
 * (packages/backend/functions/src/ai/chatAssistant.ts). This is a faithful
 * summary for quick answers, not a replacement for the official doc — the
 * assistant is told to point to it (and to games@umojaoutreach.org / the
 * app's Conflict Resolution Form) for anything with real stakes: a formal
 * contest, dispute, or figure someone needs to rely on officially.
 * Sourced from the published "UMOJA GAMES 2026 - Rules & Regulations" doc
 * as of August 2026 — update this file whenever the org revises it.
 */
export const TOURNAMENT_RULES = {
  eligibility: [
    "Open to the Muslim community, all ages — boys, girls, women, and men.",
    "Registering means agreeing to the Code of Conduct; violations can eliminate the player, manager, captain, other affiliates, or the whole team, with no refund.",
  ],
  codeOfConduct: [
    "Players, managers, coaches, and spectators are expected to uphold Islamic values and venue rules (including health/safety protocols).",
    "Male players, managers, coaches, and spectators may not watch female matches, except Girl's 8 & Under and the Toddlers' Soccer Camp.",
    "No tobacco, marijuana, e-cigarettes, drugs, alcohol, or hookah/shisha at any Umoja venue (fields, hotels, parking lots) — violations can mean suspension, ejection, or a lifetime ban.",
    "Code of Conduct breaches are reviewed by the Independent Review Committee.",
  ],
  registration: [
    "Team registration deadline: Aug 7, 2026, 11:59 PM ET, via the Umoja App.",
    "Roster Lock Date (jersey numbers finalized): Aug 11, 2026 — required for 'Team Registration Complete' status.",
    "Player registration deadline: Aug 7, 2026, 11:59 PM ET — needs a completed form, payment, and a headshot from the last 6 months.",
    "Missing the deadline means automatic deregistration, no exceptions.",
  ],
  checkIn: [
    "Check-in is app-only — there's no in-person/on-site check-in.",
    "Check-in deadline: Aug 12, 2026, 11:59 PM ET. Missing it means automatic disqualification, no refund.",
    "Requires a player photo plus a government ID — passport, driver's license, or birth certificate (birth certificate is NOT accepted for Men's Open, Men's Over 30, or Women's Open).",
    "Check-ins are processed first-come-first-served; anything submitted before the deadline is processed by Aug 13, 2026, 11:59 PM ET.",
    "A player is only eligible to play once they show 'Player Checked-In' status in the app.",
  ],
  lateCheckIn: [
    "Late check-in requests go through the app; approval isn't guaranteed and is at the Independent Review Committee's discretion.",
    "Processing windows: Aug 14, 8–12 PM ET (for requests filed before Aug 13, 8 PM), and Aug 15, 8–12 PM ET (for requests filed before Aug 14, 8 PM).",
  ],
  playerCards:
    "Once checked in, players get a uPass (player card) in the app with name, photo, team/category, and jersey number. Players must show their uPass to referees before each game — no valid card means disqualification from that game.",
  freeAgentsAndTransfers: [
    "Free agents are listed in the app; a team picks one up by emailing games@umojaoutreach.org.",
    "Transfers between teams need both captains' consent (CC'd on the request email) and must be submitted before Aug 13, 2026, 11:59 PM ET.",
  ],
  refunds:
    "Strict no-refund policy for any player- or team-initiated cancellation, withdrawal, no-show, or disqualification, regardless of date or reason. The only exception is if Umoja itself doesn't approve a team's initial application.",
  medical: "Umoja does not provide medical coverage — players/managers are responsible for their own travel and medical insurance.",
  contestPeriod: [
    "Runs Aug 7–14, 2026, 11:59 PM ET. Eligibility contests (age, faith, or any other eligibility requirement) go through the app's Conflict Resolution Form only — $25 non-refundable fee per contest, no limit on how many a team can file.",
    "A contested player has 24 hours to respond with documentation and may keep playing until the Committee decides. Missing that or failing eligibility means immediate removal, possibly with team-wide consequences, no refund.",
  ],
  stayAndPlay:
    "Anyone living more than 50 miles from the venue (18031 Central Park Cir, Boyds, MD 20841) must stay at a designated hotel, or pay a $130 per-player opt-out fee at check-in. Designated hotels are booked via the app/website.",
  categories:
    "Men's Open/Over 40/Over 30 (9v9, no age limit besides the +40/+30 cutoffs); Boy's 17U/14U/12U/10U (7v7); Boy's 8U (5v5); Women's Open, Girl's 14U/10U (5v5); Umoja Soccer Camp (training, age 6 & under). A player may also play up in an older category, but pays separately for each — schedule conflicts between a player's two categories are not resolved by the organizers.",
  teamSize: "Max roster size: 18 for the 9v9 categories, 14 for 7v7, 10 for 5v5.",
  fieldsAndBalls:
    "9-aside ~80×55 yd (7×21 ft goals); 7-aside ~55×35 yd; 5-aside ~35×25 yd (6×4 ft goals). Size 5 balls except Boy's 8U/10U/12U and Girl's 10U, which use size 4; the Soccer Camp uses size 3.",
  schedule:
    "Two halves plus a short halftime: 9-aside is 25 min/half, 7-aside and 5-aside are 20 min/half (5-min halftime). Boy's 8U and Girl's 10U may run shortened games. About 30 minutes is set aside for congregational prayers around prayer times. The Tournament Committee can adjust length, breaks, or scheduling for weather, delays, or safety.",
  forfeits: [
    "5-minute grace period, then a forfeit is called if a team doesn't meet the minimum: 6 players (9-aside), 5 (7-aside), 3 (5-aside).",
    "Forfeit result: the present/eligible team wins 5–0; the other side takes a 0–5 loss. The match is not rescheduled.",
    "Double no-show (neither team ready): recorded 0–0, zero points both sides, and in knockout stages neither team advances.",
  ],
  weather:
    "Play stops automatically for severe weather (a tornado means full evacuation). If the stoppage happens after 75% of the game is done, the score stands even if tied; under 75% complete or a stoppage under 15 minutes, play resumes with no time added back. Games that must produce a winner (QF/SF/finals) that are tied and under 75% complete resume to finish full time.",
  independentReviewCommittee:
    "Handles Code of Conduct issues, contests, and complaints. All complaints go through the Umoja App only — a $25 admin fee per review. Contacting Umoja officers or referees directly outside the app can itself lead to penalties.",
  pointsAndTiebreakers:
    "3 points for a win, 0 for a loss. Group ties are broken in order by: head-to-head result, goal difference, goals scored, goals conceded, then fewer cards (2 yellow = 1 red). Still tied → penalty shoot-out. Every tied game, not just group play, goes to a shoot-out after regulation — no extra time in knockout games. The shoot-out winner gets +1 goal scored / the loser −1 conceded for standings purposes, regardless of the actual shoot-out score.",
  powerPlayRule:
    "Applies to every Boy's and Girl's youth category (not Men's/Women's). Once a game's goal difference reaches 5, the losing team may add one extra player; at 8, a second extra player (2 extra max). Extra players are withdrawn again once the gap drops back to 4 and 7 respectively.",
  goalDifferentialCap:
    "Applies to the same Boy's/Girl's youth categories (not Men's/Women's) — the final recorded score caps the goal differential at 5, regardless of the real scoreline.",
  penaltyShootout:
    "Only players on the field at the final whistle may take kicks. Each team picks 3 shooters, then sudden death with remaining eligible players; if everyone's gone once, the order resets. Goalkeepers can be swapped between kicks if the new keeper was on the field at full time.",
  equipment:
    "Distinct jersey colors per team (pinnies available for a color clash); numbered jerseys, same number all tournament, rosters with numbers due Aug 11, 2026. Goalkeeper jerseys must contrast the team's, no caps/hats. No metal or replaceable studs. No jewelry, even taped over. Shin guards required. Glasses need a sports strap.",
  substitutions:
    "Unlimited substitutions at any stoppage, referee permitting — the team in possession initiates the substitution, then the opponent may also sub. Injured players can be subbed any time at the referee's discretion.",
  offsides: "No offside rule applies in this tournament.",
  goalKicksAndThrowIns:
    "A goal kick must touch/bounce in the kicking team's own half before crossing midfield, or it becomes a throw-in for the other team at midfield. Throw-ins require both feet on the ground and the ball thrown from behind the head — a goal can never be scored directly from one.",
  slideTackles:
    "Outfield players may not slide tackle — winning the ball by sliding and contacting it first is not allowed, except where there's clearly no opponent nearby (e.g. keeping a ball from going out). Goalkeepers may slide to clear the ball if it's judged a genuine ball-only attempt, not careless.",
  freeKicks: "The ball must be stationary before a free kick; intentional defensive encroachment can draw a yellow card. The referee decides direct vs. indirect.",
  cardsAndDiscipline: [
    "A red card, or two yellows in one game, means an immediate send-off — the team plays down a player for the rest of that match, and the player is suspended for their division's next game, even across rounds (e.g. into the knockout stage).",
    "Three yellow cards accumulated across any games in a player's division — group stage and knockout stage combined, with no reset in between — also triggers a one-game suspension.",
    "Suspensions don't automatically carry over into a player's other categories, but serious incidents can extend across divisions at the organizers' discretion.",
    "Referees can refer an incident to the Independent Review Committee, who can extend a suspension or disqualify a player outright.",
    "Flagrant abuse, foul language, or a physical altercation can lead to a ban from future Umoja Games entirely.",
  ],
  refereeAuthority:
    "The referee's decision is final; play only starts and stops on the whistle. Verbal warnings and yellow/red cards address unsporting behavior, arguing calls, player-to-player conflict, profanity or obscene gestures, and malicious foul play.",
} as const;
