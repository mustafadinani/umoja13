# Umoja Games — Implementation Spec

Distilled from `chats/chat1.md` (full design iteration transcript) and a line-by-line
read of both `.dc.html` prototypes. This is the source of truth for the real
(Firestore-backed) implementation — the prototypes stay in `project/` as visual
reference only; don't copy their DSL, just their behavior/visual output.

Tournament: **Umoja Games 2026** (edition "Umoja13"), Maryland SoccerPlex,
18031 Central Park Circle, Boyds, MD 20841 — August 14–16, 2026 (Fri/Sat/Sun).
Community context: Muslim-youth-community soccer tournament (Hunt missions
reference Salaam greetings, dua/dhikr, mosque visits, sadaqah) — keep this
tone in copy but don't over-index visuals on it beyond what's in the prototype.

## Roles
`fan | player | captain | referee | commissioner | admin`. Captain = player
dashboard + captain tools (roster/jersey mgmt, complaints). Commissioner and
admin both see all games/categories; commissioner owns the finalize +
moderation queues. A user can hold multiple roles; `primaryRole` drives nav.
Web app has all 6 roles. Mobile app is intentionally narrower: fan/player/
captain only (no referee/commissioner/admin UI) — matches original design
intent ("mobile = personal experience", web = "public hub with role dashboards").

## Real categories (14) — packages/shared/src/constants/categories.ts
Men's Open (9v9), Men's Over 40 (9v9, 40+ or turning 40 in 2026), Men's Over 30
(9v9), Boys 20U (7v7, born ≥ Jan 1 2006), Boys 17U (7v7, ≥2009), Boys 14U (7v7,
≥2012), Boys 12U (7v7, ≥2014), Boys 10U (7v7, ≥2016), Boys 8U (5v5, ≥2018,
festival/no-standings), Women's Open (7v7), Girls 14U (7v7, ≥2012), Girls 11U
(7v7, ≥2015), Girls 8U (5v5, ≥2018, festival), Umoja Soccer Camp (non-competitive,
age 6 & under as of Jan 1 2026). DOB cutoffs feed the AI age-eligibility check.

## Standings math
Win = 3 pts, draw = 1 pt, loss = 0. Goal diff: += goals scored, −= goals
conceded, per goal event (not per game margin). Always computed from game
results (via Cloud Function trigger on game finalize), never stored as
source of truth. Festival categories (Boys/Girls 8U) track no standings.

## Game
`status`: scheduled | live | final | forfeited (separate from `gameCard.status`:
not_submitted | awaiting_commissioner | final, and from `forfeit` which is its
own record). `round`: group | qf | sf_ab | sf_cd | final. Events: goal | yellow
| red, with red-carded players excluded from further event pickers for that
game (can still score/get a card in the same event that sends them off, per
"they are however allowed to score and then get a red card"). MOTM is a
**single combined** pick by the referee across both rosters — separate from
fan "Player of the Match" popularity voting (`potmVotes`), which is a
different mechanic entirely. Referee flow, in order: ① Gate check (roster
photo/number/team/category, clear-to-play toggle, min 4/side; forfeit
declaration lives here too) → ② Match console (score via goal buttons only —
no separate +/- stepper; match log directly under the scoreboard) → ③ MOTM →
④ Submit game card (photo capture → stubbed OCR match/mismatch → send to
commissioner). Sections 2-4 stay locked until gate check completes. Admin can
also directly set any game's status/score; commissioner "Calls it Final" from
a queue of cards awaiting finalization.

## Forfeit rules (verbatim from chat, use as real copy)
5-minute grace period. Minimum to start: 9-aside 6, 7-aside 5, 5-aside 3. One
team short → other team wins 5–0. Both short → "Double No-Show", recorded
0–0, zero points both sides, neither advances in knockout stages, no GF/GA
recorded. Referee decision is final on the field; only disciplinary review
possible, not result changes. Declared by the **referee** (not the captain —
this was explicitly moved from captain dashboard to above the gate-check UI).

## Check-in (per player **per category**, not per player overall)
A player in 2 categories checks in twice, producing two independent
`CheckIn`/`TournamentPass` records. Flow: confirm identity (waiver already
signed at registration, don't re-ask) → selfie → gov-ID photo → AI check
(face-match selfie-to-registration-photo + DOB/age-eligibility read) →
approved (QR pass + disclaimer that admin may randomly recheck and nullify)
or failed (resubmit) → repeated failure escalates to admin review queue.
QR is blank + "PENDING REVIEW" until an admin/commissioner approves.

## Incidents (unified commissioner inbox)
One `Incident` collection, discriminated by `source`: captain_complaint
(types: ineligible_player | game_related | other, $35 fee, refunded if
upheld) | referee_flag (free text) | forfeit (auto-created notice) |
fan_message (AI-chat escalation "still stuck? ask an organizer"). Status:
submitted → under_review → resolved | denied (commissioner can cycle by
clicking the pill or via the reply modal). Unlimited two-way threaded
messaging between commissioner and filer once a case exists.

## The Hunt
**Real content is the 45-mission 2026 guide** (`packages/shared/src/constants/huntMissions.ts`,
transcribed from the Scavenger Hunt PDF) — 30 numbered missions across 3 days +
15 lettered "Open Missions" available all weekend. This supersedes the
mobile prototype's 23-mission demo subset; seed with the full real set.
7 mission types (not 6 as first assumed): photo, video, trivia, gps, qr,
text, mini_game. Photo/video/text/mini_game → facilitator review; trivia/gps/
qr → auto-scored instantly. Crew: account required, max 4 members incl. lead,
one crew per person (unique membership), no roster changes once the Hunt
begins Friday 9am. Crew creation is a 3-step flow per the final web-app
direction (invite lead → invite members by search/email with uniqueness
enforced → name the crew) — note the mobile *prototype* only implemented a
single-screen fixed-friends-list version; build the real 3-step flow for
both web and mobile since that's where the user's requirements landed.
Leaderboard shows rank/crew/members/missions-done/points; click a crew to
see its members + completed missions. Missions can appear as Moments
(source: "hunt") when a photo/video submission is approved.

## Moments
Blends game clips, Hunt photo/video submissions, and general community
posts (`source`: game | hunt | community). Real upload (camera or library) →
tag (8 tags: Goal, Save, Skill move, Celebration, Fan moment, Team entrance,
Funny moment, Community — the starter doc also lists "Referee moment", add
it as a 9th) → optional player tag → post → pending moderation for youth
categories → appears on the wall with a source badge, like button (any
user), delete button (own posts only).

## Sponsors (real names used in the design, seed these)
Ubuntu Bank (presenting), Sankofa Grill (food), DMV Auto Group (transport),
Jollof Junction (food truck), Capital Physio (recovery), Kente Kits (jersey
sponsor, e.g. of Umoja Stars). Clickable → story/goals modal.

## AI Chat
Prototype used a keyword-matched canned-answer bot; per user's direction,
build this for real against the Claude API via a Cloud Function, with a
"still stuck? message an organizer" fallback that files a `fan_message`
Incident.

## What's stubbed vs. real (per user's explicit direction)
- **Real**: Firebase Auth, Firestore (no localStorage anywhere), Storage for
  all media, Stripe test-mode Checkout for the $35 complaint fee, Claude
  vision for check-in selfie/ID verification.
- **Stubbed** (clearly marked, swappable later): referee game-card photo →
  score OCR. Build the upload + commissioner review queue for real; the
  "AI reads the card" step returns a placeholder result function.

## Source docs kept for reference
- `project/uploads/umoja13_tournament_app_starter.md` — generic structural brief (roles, entities, permission matrix, complaint/status enums) — no real team/sponsor names.
- `project/uploads/Umoja Games 2026 Scavenger Hunt FINAL .pdf` — real Hunt content, fully transcribed into `docs/hunt-missions.json`.
- `chats/chat1.md` — full iteration history; consult for exact UX decisions when in doubt (e.g. "make it a stepper", "left = SS, right = TS", nav order, etc).
