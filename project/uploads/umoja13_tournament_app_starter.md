# Umoja13 Soccer Tournament App — Starter Product Brief

## 1. Vision

Create a mobile-first tournament app that helps Umoja13 organize a high-energy, three-day soccer event while giving players, captains, referees, commissioners, admins, and fans a shared place to follow the action.

The app should not only manage tournament logistics, but also capture the spirit of the event: highlights, photos, fan competitions, scavenger hunts, player pages, live updates, awards, and community moments.

## 2. Primary Goals

1. Make tournament operations smoother for admins, commissioners, captains, referees, and players.
2. Give fans a fun way to follow games, upload highlights, join competitions, and engage with the event.
3. Provide every player with a personal player page connected to their team, category, stats, schedule, and highlights.
4. Support flexible tournament formats across a three-day event, including seeding rounds, knockout rounds, round-robin rounds, and hybrid formats.
5. Capture, moderate, and publish exciting tournament moments through fan-uploaded photos and videos.
6. Provide a clear complaint/reporting process that routes issues to the commissioner.
7. Support youth categories safely with age eligibility, check-in, waivers, media consent, and content moderation.

---

## 3. Tournament Categories

| Tournament category | Format | Age restrictions |
|---|---:|---|
| Men’s Open | 9v9 | No age restriction |
| Men’s Over 40 | 9v9 | Age 40+ or turning 40 in 2026 |
| Men’s Over 30 | 9v9 | Age 30+ or turning 30 in 2026 |
| Boy’s 20 & Under | 7v7 | Born on or after Jan 1, 2006 |
| Boy’s 17 & Under | 7v7 | Born on or after Jan 1, 2009 |
| Boy’s 14 & Under | 7v7 | Born on or after Jan 1, 2012 |
| Boy’s 12 & Under | 7v7 | Born on or after Jan 1, 2014 |
| Boy’s 10 & Under | 7v7 | Born on or after Jan 1, 2016 |
| Boy’s 8 & Under | 5v5 | Born on or after Jan 1, 2018 |
| Women’s Open | 7v7 | No age restriction |
| Girl’s 14 & Under | 7v7 | Born on or after Jan 1, 2012 |
| Girl’s 11 & Under | 7v7 | Born on or after Jan 1, 2015 |
| Girl’s 8 & Under | 5v5 | Born on or after Jan 1, 2018 |
| Umoja Soccer Camp | Training camp | Age 6 & under as of Jan 1, 2026 |

### Category rules to configure in the admin panel

Each category should allow admins to configure:

- Format: 9v9, 7v7, 5v5, or training camp.
- Minimum and maximum roster sizes.
- Guest player rules.
- Age verification requirements.
- Check-in deadline.
- Seeding rules.
- Tiebreakers.
- Advancement rules.
- Number of fields assigned.
- Match length.
- Halftime length.
- Referee assignment rules.
- Whether stats are tracked.
- Whether fan uploads are enabled.

---

## 4. User Roles

## 4.1 Player

Players use the app to manage their tournament identity and follow their own schedule.

### Player capabilities

- Create or claim a player profile.
- View team, roster, category, schedule, results, and standings.
- Complete pre-tournament check-in.
- Upload required documents if needed, such as age verification or waiver forms.
- View their own player page.
- See highlights tagged to them.
- Receive notifications about match times, field changes, check-in reminders, and tournament announcements.
- Submit a complaint/report to the commissioner.
- View awards, badges, and player achievements.

## 4.2 Fan

Fans use the app to experience the tournament, contribute media, and join event competitions.

### Fan capabilities

- Follow teams, players, categories, and games.
- View schedules, scores, standings, brackets, and game pages.
- Upload photos and video highlights into a specific game page.
- Tag uploaded media by team, player, event type, and game moment.
- Join scavenger hunt challenges.
- Vote for highlight of the day, player of the match, best celebration, fan moment, and goal of the tournament.
- Receive announcements about food, music, ceremonies, contests, weather, parking, and schedule changes.

## 4.3 Admin

Admins manage the tournament setup, structure, content, and operations.

### Admin capabilities

- Create and manage tournaments.
- Create and manage categories.
- Create teams and assign them to categories.
- Invite captains, refs, commissioners, and staff.
- Approve or remove players from rosters.
- Configure tournament stages.
- Configure seeding rounds, knockout rounds, round-robin rounds, or hybrid formats.
- Generate schedules.
- Assign fields, referees, and match times.
- Override scores, standings, and bracket placement.
- Publish announcements.
- Moderate fan uploads.
- Manage scavenger hunt tasks and prize rules.
- Manage sponsors, vendors, maps, and event information.
- Export rosters, check-in reports, schedules, complaints, and media reports.

## 4.4 Commissioner

Commissioners handle fairness, disputes, complaints, eligibility issues, and tournament rulings.

### Commissioner capabilities

- Receive and manage player/captain complaints.
- Review evidence, uploaded media, referee reports, and match incidents.
- Issue rulings.
- Approve disciplinary actions.
- Mark complaints as open, under review, resolved, rejected, or escalated.
- Add private notes visible only to commissioners/admins.
- Communicate decisions to relevant teams, captains, and admins.
- Lock or unlock affected matches if a ruling impacts standings or advancement.

## 4.5 Referee

Referees manage assigned games and submit official match outcomes.

### Referee capabilities

- View assigned games.
- Check in for referee assignments.
- Start and end matches.
- Enter final score.
- Log goals, cards, injuries, forfeits, no-shows, and incidents.
- Submit match report.
- Confirm captain sign-off if required.
- Flag disputes or unusual events for commissioner review.

## 4.6 Captain

Captains manage their team roster and act as the primary team representative.

### Captain capabilities

- Create or manage team profile.
- Invite players to roster.
- Verify roster details.
- Track which players have checked in.
- Submit lineup if required.
- Receive team-specific notifications.
- Report roster issues.
- Submit complaints on behalf of the team.
- Confirm match results if required.
- Communicate with admins or commissioners.

---

## 5. Core App Features

## 5.1 Tournament Home

The main landing area for the event.

### Content

- Featured games.
- Live scores.
- Upcoming games.
- Tournament announcements.
- Brackets and standings.
- Category shortcuts.
- Fan highlight feed.
- Scavenger hunt leaderboard.
- Sponsor and vendor highlights.
- Map, parking, field layout, and event schedule.

## 5.2 Category Pages

Each tournament category should have its own page.

### Category page content

- Category name.
- Format, such as 9v9, 7v7, 5v5, or training camp.
- Age restrictions.
- Teams.
- Schedule.
- Standings.
- Bracket.
- Rules.
- Top players.
- Recent highlights.
- Awards.

## 5.3 Team Pages

Each team should have a team page that gives fans, players, captains, and admins a central team hub.

### Team page content

- Team name.
- Logo or crest.
- Category.
- Captain and staff.
- Roster.
- Schedule.
- Results.
- Standings position.
- Team highlights.
- Player cards.
- Awards.
- Team check-in status, visible only to authorized roles.

## 5.4 Player Pages

Every player should have an individual page that can be opened from rosters, game pages, leaderboards, highlights, and awards.

### Player page content

- Player photo.
- Name.
- Team.
- Category.
- Jersey number.
- Position.
- Bio.
- Schedule.
- Match results.
- Stats, if tracked.
- Highlights tagged to the player.
- Awards and badges.
- Check-in status, visible only to authorized roles.
- Media consent status, visible only to admins/commissioners.

### Optional player stats

- Goals.
- Assists.
- Saves.
- Clean sheets.
- Cards.
- Player of the match awards.
- Fan votes.
- Highlight appearances.

## 5.5 Game Pages

Each game should have its own page that becomes the event hub for that match.

### Game page content

- Teams.
- Category.
- Field.
- Date and time.
- Referee.
- Status: scheduled, live, final, postponed, disputed, cancelled.
- Score.
- Lineups, if used.
- Game events.
- Referee report.
- Fan uploads.
- Official highlights.
- Complaints/disputes linked to the match.
- Player of the match voting.

---

## 6. Fan-Uploaded Highlights

Fans should be able to open a specific game page and upload their own photos or videos.

## 6.1 Upload flow

1. Fan opens the tournament app.
2. Fan selects a category, team, or game.
3. Fan opens the game page.
4. Fan taps **Upload Highlight**.
5. Fan chooses photo or video.
6. Fan selects optional tags:
   - Goal
   - Save
   - Skill move
   - Celebration
   - Fan moment
   - Team entrance
   - Referee moment
   - Funny moment
   - Community moment
7. Fan optionally tags a team, player, and approximate minute.
8. Upload goes to moderation queue or auto-publishes depending on admin settings.
9. Approved media appears on the game page, team page, player page, and highlight feed.

## 6.2 Moderation requirements

Because the tournament includes youth players, moderation and privacy controls are important.

Recommended controls:

- Media consent for players and guardians.
- Admin moderation queue.
- Ability to hide, approve, reject, or remove uploads.
- Report button on every media item.
- Auto-flagging for inappropriate content where possible.
- Restrictions on tagging minors if consent is missing.
- Ability to disable uploads for specific categories or games.
- Audit log for moderation decisions.

## 6.3 Highlight engagement ideas

- Highlight of the Day.
- Goal of the Tournament.
- Best Save.
- Best Celebration.
- Best Fan Moment.
- Best Team Entrance.
- Community Spirit Award.
- Sponsor-branded highlight reels.

---

## 7. Player Check-In

Players should be able to check in before the tournament begins. Check-in should help organizers confirm eligibility, rosters, waivers, and event readiness.

## 7.1 Player check-in flow

1. Player receives invite link or team code from captain/admin.
2. Player creates account or logs in.
3. Player claims their roster spot.
4. Player confirms name, date of birth, team, category, and jersey number.
5. Player completes waiver.
6. Player/guardian confirms media consent, if applicable.
7. Player uploads age verification if required.
8. Player receives check-in status:
   - Not started
   - In progress
   - Pending review
   - Cleared
   - Rejected
   - Needs correction
9. Player receives digital tournament pass with QR code.
10. Staff scans QR code at the event to confirm physical arrival.

## 7.2 Captain check-in dashboard

Captains should see:

- Full roster.
- Players cleared.
- Players pending.
- Players missing waivers.
- Players missing age verification.
- Players rejected or needing correction.
- Team check-in percentage.
- Button to remind players.

## 7.3 Admin check-in dashboard

Admins should see:

- Check-in totals by category.
- Check-in totals by team.
- Ineligible players.
- Missing documents.
- Pending reviews.
- Age verification queue.
- Exportable check-in report.
- QR scanner for on-site arrival.

---

## 8. Complaint and Commissioner Workflow

Players and captains should be able to submit complaints through the app. Complaints should route to the commissioner.

## 8.1 Complaint types

- Eligibility issue.
- Roster issue.
- Referee issue.
- Score dispute.
- Player conduct.
- Fan conduct.
- Safety concern.
- Schedule issue.
- Field issue.
- Other.

## 8.2 Complaint submission flow

1. Player or captain opens the app.
2. User selects **Submit Complaint**.
3. User chooses whether the complaint is connected to a specific match, team, player, or category.
4. User selects complaint type.
5. User writes description.
6. User uploads supporting photos/videos/documents if needed.
7. Complaint is submitted to commissioner queue.
8. User receives tracking status.

## 8.3 Commissioner workflow

Complaint statuses:

- Submitted.
- Under review.
- Need more information.
- Resolved.
- Rejected.
- Escalated.

Commissioner actions:

- Add private notes.
- Request more information.
- Contact captain/admin/referee.
- Attach evidence.
- Issue decision.
- Notify impacted users.
- Lock match result if needed.
- Update standings if ruling affects result.

---

## 9. Three-Day Tournament Structure

The tournament is played over three days. The app should support a first round that seeds teams, followed by a flexible second stage that can be knockout, round robin, or a hybrid format.

## 9.1 Recommended event flow

### Day 1: Seeding round

Purpose: establish rankings and seed teams for the next stage.

Possible formats:

- Group round robin.
- Swiss-style seeding.
- Random draw with points table.
- Short placement games.

Admin controls:

- Number of groups.
- Teams per group.
- Games per team.
- Points system.
- Tiebreakers.
- Minimum rest time.
- Field assignments.
- Whether all teams advance or only some teams advance.

### Day 2: Advancement stage

Purpose: move teams into championship, consolation, or placement paths.

Possible formats:

- Knockout bracket.
- Round robin championship pool.
- Gold/Silver/Bronze divisions.
- Consolation bracket.
- Placement matches.
- Wildcard round.

Admin controls:

- Advancement rules.
- Bracket size.
- Seeding rules.
- Reseeding after each round.
- Manual overrides.
- Consolation options.
- Tiebreakers.

### Day 3: Finals and celebration

Purpose: conclude competitive play and celebrate teams, players, fans, volunteers, and sponsors.

Possible activities:

- Semifinals.
- Finals.
- Third-place games.
- All-star game.
- Skills challenge.
- Awards ceremony.
- Fan scavenger hunt finale.
- Sponsor/community recognition.
- Closing celebration.

## 9.2 Tournament format engine

The admin panel should include a flexible format builder.

### Stage settings

Each stage should include:

- Stage name.
- Stage type:
  - Seeding
  - Group round robin
  - Knockout
  - Double elimination
  - Placement games
  - Championship pool
  - Consolation pool
  - Training camp schedule
- Teams included.
- Match rules.
- Points rules.
- Tiebreakers.
- Advancement rules.
- Manual override options.
- Publish/unpublish state.

### Suggested tiebreakers

1. Points.
2. Goal differential.
3. Goals scored.
4. Goals allowed.
5. Head-to-head result.
6. Fair play score.
7. Coin toss or commissioner decision.

---

## 10. Scavenger Hunt Fan Competition

The scavenger hunt should turn the tournament into a festival experience and keep fans moving around the venue.

## 10.1 Core concept

Fans complete challenges during the tournament to earn points. The leaderboard updates throughout the event, and winners receive cash prizes.

## 10.2 Challenge types

- Scan QR code at each field.
- Visit sponsor booth.
- Take a photo with a team banner.
- Upload a fan celebration photo.
- Predict the winner of a featured match.
- Answer Umoja13 trivia.
- Find the mascot or event host.
- Check in at the food vendor area.
- Vote for Highlight of the Day.
- Watch a youth game and submit a cheer photo.
- Complete a sportsmanship challenge.
- Share a community appreciation message.

## 10.3 Scavenger hunt rules

Admin should be able to configure:

- Start and end time.
- Challenge list.
- Points per challenge.
- Bonus challenges.
- Age groups or family teams.
- Prize levels.
- Cash prize amounts.
- Max submissions per challenge.
- Whether submissions need review.
- Anti-cheat rules.

## 10.4 Leaderboard

Leaderboard should show:

- Rank.
- Fan name or team name.
- Points.
- Completed challenges.
- Time of last completion.
- Prize status.

## 10.5 Prize ideas

- Grand prize cash award.
- Second and third place cash awards.
- Best family team.
- Most spirited fan.
- Best photo submission.
- Sponsor prize packs.
- VIP seating or food vouchers.

---

## 11. Festive Event Features

Additional features that can make the tournament feel more alive:

## 11.1 Live event feed

A central feed with:

- Scores.
- Highlights.
- Fan photos.
- Announcements.
- Player awards.
- Sponsor messages.
- Field updates.
- Weather or delay alerts.

## 11.2 Awards and badges

Possible awards:

- Player of the Match.
- Team of the Day.
- Goal of the Tournament.
- Best Save.
- Best Celebration.
- Best Sportsmanship.
- Rising Star.
- Fan Favorite.
- Community Hero.
- Best Team Entrance.
- Best Dressed Fan.

## 11.3 Fan voting

Fans can vote on:

- Player of the match.
- Goal of the day.
- Best celebration.
- Best fan photo.
- Best team chant.

Voting controls:

- One vote per user.
- Voting windows.
- Category-specific voting.
- Admin moderation.
- Public or hidden results.

## 11.4 Venue and event tools

Helpful event-day tools:

- Field map.
- Parking map.
- Food vendor list.
- Restroom locations.
- First aid location.
- Lost and found.
- Volunteer station.
- Sponsor booth map.
- Emergency alerts.
- Push notifications for schedule changes.

## 11.5 Community and sponsor activations

Ideas:

- Sponsor passport challenge.
- Vendor specials inside the app.
- Digital coupons.
- Photo wall displayed on a screen at the venue.
- Sponsor-branded player of the match.
- Community shout-outs.
- Donation link or community fundraising feature.

---

## 12. Suggested App Screens

## Public/Fan screens

- Home.
- Tournament schedule.
- Categories.
- Teams.
- Players.
- Game page.
- Brackets.
- Standings.
- Highlight feed.
- Upload highlight.
- Scavenger hunt.
- Leaderboard.
- Awards.
- Venue map.
- Vendors and sponsors.
- Notifications.

## Player screens

- Player dashboard.
- My schedule.
- My team.
- My player page.
- Check-in.
- Waiver and consent.
- My highlights.
- Submit complaint.
- Notifications.

## Captain screens

- Captain dashboard.
- Team roster.
- Invite players.
- Check-in tracker.
- Schedule.
- Match confirmation.
- Submit complaint.
- Team messages.

## Referee screens

- Referee dashboard.
- Assigned matches.
- Match scorecard.
- Incident report.
- Submit final result.

## Commissioner screens

- Commissioner dashboard.
- Complaint queue.
- Complaint detail.
- Match disputes.
- Eligibility review.
- Rulings.
- Notes and audit trail.

## Admin screens

- Admin dashboard.
- Tournament setup.
- Category management.
- Team management.
- Player management.
- Schedule builder.
- Stage/bracket builder.
- Referee assignments.
- Check-in dashboard.
- Media moderation.
- Complaint oversight.
- Scavenger hunt builder.
- Announcement center.
- Sponsor/vendor manager.
- Reports and exports.

---

## 13. Suggested Data Model

## Core entities

### User

- id
- name
- email
- phone
- role assignments
- profile photo
- notification preferences
- created_at

### RoleAssignment

- id
- user_id
- role: player, fan, admin, commissioner, ref, captain
- tournament_id
- team_id, optional
- category_id, optional

### Tournament

- id
- name
- year
- start_date
- end_date
- location
- description
- status

### Category

- id
- tournament_id
- name
- format
- age_rule
- roster_min
- roster_max
- match_length
- settings

### Team

- id
- tournament_id
- category_id
- name
- logo
- captain_user_id
- status

### PlayerProfile

- id
- user_id
- display_name
- date_of_birth
- photo
- bio
- position
- jersey_number
- media_consent_status
- guardian_consent_status

### RosterEntry

- id
- player_profile_id
- team_id
- category_id
- eligibility_status
- check_in_status
- captain_approved
- admin_approved

### Match

- id
- tournament_id
- category_id
- stage_id
- home_team_id
- away_team_id
- field_id
- referee_id
- scheduled_start
- actual_start
- status
- home_score
- away_score
- winner_team_id
- dispute_status

### Stage

- id
- tournament_id
- category_id
- name
- type
- sequence_order
- format_config
- advancement_config
- status

### MatchEvent

- id
- match_id
- event_type
- team_id
- player_id
- minute
- notes
- created_by

### CheckIn

- id
- roster_entry_id
- waiver_status
- age_verification_status
- media_consent_status
- physical_arrival_status
- qr_code
- reviewed_by
- reviewed_at

### MediaAsset

- id
- uploaded_by_user_id
- match_id
- team_id
- player_id
- media_type
- file_url
- thumbnail_url
- caption
- tags
- moderation_status
- featured_status
- created_at

### Complaint

- id
- submitted_by_user_id
- assigned_commissioner_id
- tournament_id
- category_id
- match_id
- team_id
- player_id
- complaint_type
- description
- evidence_urls
- status
- decision
- created_at
- resolved_at

### ScavengerHunt

- id
- tournament_id
- name
- start_time
- end_time
- prize_details
- rules
- status

### ScavengerChallenge

- id
- scavenger_hunt_id
- title
- description
- points
- challenge_type
- requires_photo
- requires_qr_scan
- requires_review
- max_submissions

### ScavengerSubmission

- id
- challenge_id
- user_id
- media_url
- answer_text
- qr_code_id
- status
- points_awarded
- submitted_at

### Notification

- id
- user_id
- tournament_id
- title
- body
- type
- sent_at
- read_at

### Field/Venue

- id
- tournament_id
- name
- location_description
- map_coordinates
- field_type

### Sponsor/Vendor

- id
- tournament_id
- name
- logo
- booth_location
- description
- offer
- website

---

## 14. Permissions Matrix

| Feature | Fan | Player | Captain | Ref | Commissioner | Admin |
|---|---:|---:|---:|---:|---:|---:|
| View public schedule | Yes | Yes | Yes | Yes | Yes | Yes |
| View standings/brackets | Yes | Yes | Yes | Yes | Yes | Yes |
| Upload game media | Yes | Yes | Yes | Optional | Yes | Yes |
| Moderate media | No | No | No | No | Optional | Yes |
| Create player profile | No | Yes | Optional | No | No | Yes |
| Manage roster | No | No | Yes | No | No | Yes |
| Complete player check-in | No | Yes | No | No | No | Yes |
| View team check-in status | No | Own status only | Team only | No | Category-wide | Yes |
| Enter score | No | No | No | Assigned games | Optional | Yes |
| Confirm score | No | No | Optional | Yes | Yes | Yes |
| Submit complaint | Optional | Yes | Yes | Optional | No | Yes |
| Resolve complaint | No | No | No | No | Yes | Yes |
| Configure tournament format | No | No | No | No | Optional | Yes |
| Publish announcements | No | No | No | No | Optional | Yes |
| Manage scavenger hunt | No | No | No | No | Optional | Yes |
| Participate in scavenger hunt | Yes | Optional | Optional | Optional | Optional | Optional |

---

## 15. MVP Scope

## MVP must-have features

1. User login and role-based access.
2. Tournament category setup.
3. Team and roster management.
4. Player profile pages.
5. Player check-in with waiver/eligibility status.
6. Schedule and match pages.
7. Three-day tournament stage builder.
8. Seeding round support.
9. Knockout and round-robin advancement options.
10. Referee score submission.
11. Standings and brackets.
12. Fan photo/video uploads to game pages.
13. Media moderation.
14. Complaint submission and commissioner review.
15. Scavenger hunt challenges and leaderboard.
16. Event announcements.
17. Basic venue map and field information.

## Nice-to-have features after MVP

- Live game clock.
- Full stat tracking.
- Auto-generated highlight reels.
- AI-assisted highlight tagging.
- Push notifications.
- Sponsor coupon system.
- Public big-screen display mode.
- Player cards for sharing on social media.
- QR-based scavenger hunt check-ins.
- Mobile wallet tournament pass.
- Offline mode for referees and admins.
- Analytics dashboard.

---

## 16. Example User Stories

## Fan stories

- As a fan, I want to follow my favorite team so I can quickly see their schedule and results.
- As a fan, I want to upload a video to a game page so the community can see a great moment I captured.
- As a fan, I want to join the scavenger hunt so I can compete for cash prizes.
- As a fan, I want to vote for the best highlight so I can participate in the tournament experience.

## Player stories

- As a player, I want to check in before the tournament so I know I am eligible to play.
- As a player, I want a player page so friends and family can follow my tournament experience.
- As a player, I want to see my team schedule so I know where to be and when.
- As a player, I want to submit a complaint so I can raise an issue to the commissioner.

## Captain stories

- As a captain, I want to manage my roster so I can make sure every player is cleared before the tournament.
- As a captain, I want to see check-in status by player so I can follow up before game day.
- As a captain, I want to submit a team complaint so the commissioner can review an issue.

## Referee stories

- As a referee, I want to see assigned games so I know where to report.
- As a referee, I want to submit final scores so standings update quickly.
- As a referee, I want to report incidents so commissioners can review them.

## Commissioner stories

- As a commissioner, I want a complaint queue so I can resolve issues fairly and quickly.
- As a commissioner, I want to review evidence and referee reports so I can make informed rulings.
- As a commissioner, I want to lock disputed match results so standings do not advance incorrectly.

## Admin stories

- As an admin, I want to configure tournament stages so I can run seeding, knockout, round robin, or hybrid formats.
- As an admin, I want to generate schedules so each category has fields, match times, and referees.
- As an admin, I want to moderate fan uploads so the event stays safe and family-friendly.
- As an admin, I want to publish announcements so everyone receives important updates.

---

## 17. Suggested Technical Approach

This section is intentionally flexible and can be adjusted based on the development team.

## Frontend options

- Mobile-first responsive web app.
- Progressive Web App for easy access without app store approval.
- Native mobile app later if needed.

## Backend options

- API server with role-based permissions.
- Relational database for tournament structure, teams, rosters, matches, standings, complaints, and scavenger hunt results.
- Object storage for photos and videos.
- Background jobs for video processing, thumbnails, notifications, and highlight generation.

## Helpful technical requirements

- Role-based access control.
- Audit logs for scores, eligibility, complaints, and moderation.
- Media storage with compression and thumbnails.
- Push/email/SMS notifications.
- QR code generation and scanning.
- Offline-tolerant referee score submission.
- Admin export tools.
- Strong privacy controls for youth players.

---

## 18. Safety, Privacy, and Youth Protection

Because the event includes youth players, the app should include safeguards from the beginning.

Recommended safeguards:

- Guardian consent for minors.
- Media consent controls.
- Ability to remove or hide youth player photos/videos quickly.
- Restricted access to sensitive player information.
- Date of birth visibility limited to authorized roles.
- Moderation queue for youth game uploads.
- Report button for inappropriate content.
- Admin audit trail.
- Clear code of conduct.
- Emergency contact workflow, if collected.
- Minimal collection of sensitive personal data.

---

## 19. Admin Configuration Checklist

Before the tournament, admins should be able to complete this checklist:

- Create tournament.
- Add event dates and location.
- Add categories.
- Configure roster limits.
- Configure age rules.
- Configure check-in requirements.
- Add fields and venue map.
- Add teams.
- Invite captains.
- Open player registration/check-in.
- Review player eligibility.
- Assign referees.
- Build Day 1 seeding format.
- Build Day 2/Day 3 advancement format.
- Generate schedule.
- Publish schedule.
- Set up scavenger hunt.
- Add sponsors and vendors.
- Prepare announcements.
- Configure media moderation.
- Test QR check-in.
- Export final roster report.

---

## 20. Open Questions

These are questions to answer before moving into design or development.

1. Will players register themselves, or will captains upload rosters first?
2. Do all youth players need guardian accounts, or only guardian consent forms?
3. Will age verification require document upload, in-person verification, or both?
4. Should fan uploads be published instantly, or should every upload be moderated first?
5. Who can tag players in media uploads?
6. Will stats be tracked for all categories or only selected categories?
7. Are referees expected to use the app live during the game or only after the game?
8. What are the official points and tiebreaker rules for seeding?
9. Can teams play across multiple categories?
10. Are guest players allowed?
11. How many fields are available each day?
12. What is the target match length for each format?
13. How much time is required between a team’s matches?
14. What exact cash prize structure is planned for the scavenger hunt?
15. Should the app support sponsors, vendors, donations, or merchandise?
16. Should there be a public website view for family members who do not create accounts?
17. What data should be exportable after the tournament?

---

## 21. Suggested Build Phases

## Phase 1: Foundation

- Auth and roles.
- Tournament/category/team/player setup.
- Player pages.
- Schedule display.
- Basic admin dashboard.

## Phase 2: Operations

- Player check-in.
- Captain roster dashboard.
- Referee assignments.
- Score submission.
- Standings and bracket generation.
- Complaint routing to commissioner.

## Phase 3: Fan Experience

- Game pages.
- Fan media uploads.
- Highlight feed.
- Fan voting.
- Scavenger hunt.
- Leaderboard.

## Phase 4: Event Polish

- Push notifications.
- Venue map.
- Sponsor/vendor pages.
- Awards.
- Big-screen photo wall.
- Analytics and exports.

## Phase 5: Advanced Enhancements

- AI-assisted highlight clipping.
- Auto-tagging players and teams.
- Live streaming integration.
- Offline referee mode.
- Custom branded player cards.
- Multi-year tournament history.

---

## 22. Starter Success Metrics

Operational metrics:

- Percentage of players checked in before tournament day.
- Number of unresolved eligibility issues at kickoff.
- Score submission time after match completion.
- Number of schedule conflicts.
- Number of complaints resolved within target time.

Fan engagement metrics:

- Number of fan accounts created.
- Number of media uploads.
- Number of scavenger hunt participants.
- Number of completed challenges.
- Votes cast for awards/highlights.
- App opens per day.

Community metrics:

- Sponsor booth visits.
- Vendor engagement.
- Social shares.
- Highlight views.
- Award participation.

---

## 23. Starter Navigation Concept

Main app tabs:

1. **Home** — live tournament feed, announcements, featured games.
2. **Schedule** — games by day, category, team, and field.
3. **Teams** — teams, rosters, player pages.
4. **Highlights** — fan uploads, official clips, voting.
5. **More** — scavenger hunt, map, sponsors, awards, check-in, complaints.

Role-specific dashboards should appear at the top of the Home tab when a user has elevated permissions.

Examples:

- Player sees **Complete Check-In**.
- Captain sees **Roster Needs Attention**.
- Referee sees **Next Assigned Match**.
- Commissioner sees **Open Complaints**.
- Admin sees **Tournament Control Center**.

---

## 24. Starter Design Tone

The app should feel:

- Energetic.
- Community-centered.
- Family-friendly.
- Competitive.
- Easy to use on game day.
- Festive and photo-friendly.
- Clear for admins and officials.

Suggested language style:

- “Game Day” instead of only “Schedule.”
- “Moments” or “Highlights” instead of only “Media.”
- “Join the Hunt” instead of only “Scavenger Hunt.”
- “Tournament Pass” instead of only “Check-In QR Code.”
- “Umoja13 Spotlight” for featured players, teams, fans, and sponsors.

---

## 25. First Prototype Recommendation

For the first clickable prototype, build these screens:

1. Fan home.
2. Category page.
3. Game page with upload highlight button.
4. Player page.
5. Team page.
6. Player check-in flow.
7. Captain roster dashboard.
8. Referee score submission.
9. Commissioner complaint queue.
10. Admin tournament format builder.
11. Scavenger hunt challenge list.
12. Scavenger hunt leaderboard.

This prototype would show the full spirit of the app: tournament operations, player identity, fan participation, flexible competition formats, and festive community engagement.
