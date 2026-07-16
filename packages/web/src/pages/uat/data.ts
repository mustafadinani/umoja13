export interface UatSection {
  id: string;
  title: string;
  desc: string;
}

export interface UatScenario {
  id: string;
  section: string;
  title: string;
  platform: "Web + Mobile" | "Web" | "Mobile";
  steps: string[];
  expect: string;
  limitation?: string;
}

export const UAT_SECTIONS: UatSection[] = [
  { id: "fan", title: "Fan", desc: "The public-facing experience — anyone can sign up as a fan with no roster ties." },
  { id: "player", title: "Player", desc: "Sign in as player@umoja.demo, or join a team from any fan account." },
  { id: "captain", title: "Captain", desc: "Sign in as captain@umoja.demo. Captains get everything a player has, plus roster and complaint tools." },
  { id: "referee", title: "Referee", desc: "Sign in as referee@umoja.demo (web only). This account is pre-assigned to the seeded live game." },
  { id: "commissioner", title: "Commissioner", desc: "Sign in as commissioner@umoja.demo (web only)." },
  { id: "admin", title: "Admin", desc: "Sign in as admin@umoja.demo (web only). Admin sees everything Commissioner does, plus these tools." },
  { id: "hunt-mobile", title: "The Hunt", desc: "Available to any signed-in account, web or mobile." },
];

export const UAT_SCENARIOS: UatScenario[] = [
  { id: "FAN-01", section: "fan", title: "Sign up as a new fan", platform: "Web + Mobile",
    steps: ['From the sign-in screen, choose "Create an account."', "Enter a name, a real or throwaway email, and a password.", "Submit."],
    expect: "You land straight on the Home screen, signed in as a fan." },
  { id: "FAN-02", section: "fan", title: "Browse Home", platform: "Web + Mobile",
    steps: ["Look over the Home screen top to bottom."],
    expect: 'A hero banner, a live-game score card (if a game is currently live), an "Up Next" game, a Hunt teaser tile, a row of recent Moments, and Announcements.' },
  { id: "FAN-03", section: "fan", title: "Schedule & category filters", platform: "Web + Mobile",
    steps: ["Go to Games → Schedule.", 'Switch between a few category chips (e.g. "Men\'s Open," "Girls 14U").'],
    expect: "The game list updates to match the selected category. On web, a sponsor strip is visible on this page." },
  { id: "FAN-04", section: "fan", title: "Standings", platform: "Web + Mobile",
    steps: ['Switch to the Standings tab within a group category (e.g. "Men\'s Open").'],
    expect: "Teams are ranked by points, then goal difference, then goals scored." },
  { id: "FAN-05", section: "fan", title: "Game detail", platform: "Web + Mobile",
    steps: ["Tap into any game from the schedule."],
    expect: "Score, a timeline of goals/cards, and any Moments tagged to that specific game." },
  { id: "FAN-06", section: "fan", title: "Team detail", platform: "Web + Mobile",
    steps: ["Tap a team name from a game or the standings."],
    expect: "Roster (if published) and that team's schedule & results." },
  { id: "FAN-07", section: "fan", title: "Moments wall — view, like, upload", platform: "Web + Mobile",
    steps: ["Open Moments and like an existing post.", 'Tap "Share" / "+ Share," pick a photo, choose a tag (e.g. "Fan moment"), and post.'],
    expect: 'Your like registers instantly. Your new post does not appear on the public wall yet — it\'s queued for moderation (verify this in COMM-02).' },
  { id: "FAN-08", section: "fan", title: "Follow a team", platform: "Web",
    steps: ["From your Fan dashboard, tap a team to follow it (star icon).", "Refresh the page."],
    expect: 'The team stays marked as followed and appears in a "followed teams" section.' },
  { id: "FAN-09", section: "fan", title: "Ask Umoja (AI chat widget)", platform: "Web",
    steps: ["Open the chat widget (bottom corner, on any page).", 'Ask something like "When does the Boys 12U bracket play?"', "Then try asking to speak with a real person / staff."],
    expect: 'A relevant reply streams in. Asking for a human should hand off to a support ticket with a ticket number.' },
  { id: "FAN-10", section: "fan", title: "Notifications", platform: "Web + Mobile",
    steps: ["Open the notification bell / Notifications screen."],
    expect: "List renders without error (may be empty on a fresh account) and unread items are marked read after opening." },
  { id: "FAN-11", section: "fan", title: "Report an issue", platform: "Web + Mobile",
    steps: ['Find "Report an issue to the commissioner" and submit a short message.'],
    expect: "A confirmation screen with a case number." },

  { id: "PLAYER-01", section: "player", title: "Join a team", platform: "Web + Mobile",
    steps: ['From a fan account with no roster ties, find "Join a team."', "Pick a category, then a team, then enter a jersey number.", "Attach a registration photo (camera or library).", "Submit."],
    expect: "You're now listed on that team's roster and your profile switches to the Player view." },
  { id: "PLAYER-02", section: "player", title: "Tournament Pass check-in flow", platform: "Web + Mobile",
    steps: ["From My Umoja, tap your Tournament Pass card.", 'Confirm "Is this you?"', "Take/attach a selfie, then a photo of a government ID.", "Submit for AI check."],
    expect: 'Every step up through submission works smoothly and shows a "checking your details…" state.',
    limitation: 'The final verdict will currently error — see "Before You Start."' },
  { id: "PLAYER-03", section: "player", title: "My teams & my games", platform: "Web + Mobile",
    steps: ['From My Umoja, open "My Teams" and tap through to the team page.', 'Open "My Games" and tap through to a game.'],
    expect: "Both lists are populated correctly and link to the right detail pages." },
  { id: "PLAYER-04", section: "player", title: "Sign out", platform: "Web + Mobile",
    steps: ["Sign out from My Umoja."],
    expect: "Returns to the sign-in screen; signing back in restores the same account state." },

  { id: "CAPTAIN-01", section: "captain", title: "View team roster", platform: "Web",
    steps: ["Open the Captain dashboard's roster view."],
    expect: "Full roster with each player's check-in status visible." },
  { id: "CAPTAIN-02", section: "captain", title: "File a complaint ($35 test payment)", platform: "Web",
    steps: ['Open "File a complaint," choose a type (e.g. "Ineligible Player"), and describe the issue.', "Continue to the $35 fee screen and pay with Stripe's test card: 4242 4242 4242 4242, any future expiry, any CVC, any ZIP."],
    expect: "Checkout completes and you're returned to the app with a case number confirmation.",
    limitation: 'Payment status may not auto-sync to "paid" yet — see "Before You Start."' },
  { id: "CAPTAIN-03", section: "captain", title: "Everything a player can do", platform: "Web + Mobile",
    steps: ["Re-run PLAYER-02 and PLAYER-03 as the captain account."],
    expect: "Identical behavior to the player role." },

  { id: "REF-01", section: "referee", title: "See your assigned game", platform: "Web",
    steps: ["Sign in and look at the Referee dashboard."],
    expect: "The seeded live game (Umoja FC vs. Harambee SC) appears, and only games assigned to you show up." },
  { id: "REF-02", section: "referee", title: "Gate check", platform: "Web",
    steps: ["Open the game console and go to the gate-check step.", "Mark a few players from each side as cleared."],
    expect: 'Each marked player flips to "cleared" and the count updates live.' },
  { id: "REF-03", section: "referee", title: "Submit a game card", platform: "Web",
    steps: ["After gate check, submit a photo of a (real or mock) game card."],
    expect: 'Photo uploads and the game moves to "awaiting commissioner" status. (Score/event extraction from the photo is intentionally a stub in this build — you\'ll still confirm scores manually; that\'s expected.)' },
  { id: "REF-04", section: "referee", title: "Flag an incident / forfeit", platform: "Web",
    steps: ['From the game console, open "Flag an incident" and describe something.'],
    expect: "Confirmation that it was filed; it should later be visible to the Commissioner (see COMM-03)." },

  { id: "COMM-01", section: "commissioner", title: "Finalize a game", platform: "Web",
    steps: ["Find a game with a submitted game card and review the score/events.", 'Tap "Call it Final."'],
    expect: "Game status flips to Final and standings recalculate for that category." },
  { id: "COMM-02", section: "commissioner", title: "Moderate a pending Moment", platform: "Web",
    steps: ["Open the moderation queue — you should see the Moment posted in FAN-07.", "Approve it."],
    expect: "It disappears from the queue and now shows up on the public Moments wall." },
  { id: "COMM-03", section: "commissioner", title: "Review an incident / complaint", platform: "Web",
    steps: ["Open the incidents list — you should see items from REF-04 and CAPTAIN-02.", "Open one and reply / resolve it."],
    expect: "The reply/resolution is saved and reflected in the list." },

  { id: "ADMIN-01", section: "admin", title: "Manually review a check-in", platform: "Web",
    steps: ['Open the Check-ins tab and filter to "Rejected" or "Pending" (this is where the check-ins from PLAYER-02 will land, given the known AI-verification gap).', "Open one and manually approve it."],
    expect: "Status updates to Approved, and that player's Tournament Pass now shows as cleared." },
  { id: "ADMIN-02", section: "admin", title: "All Games overview", platform: "Web",
    steps: ["Open the All Games tab.", 'Add a new game via "Add Game" — pick a category, two different teams, day/time/field, and (optionally) a referee.'],
    expect: "You can't accidentally pick the same team for both sides. The new game appears in the schedule immediately." },
  { id: "ADMIN-03", section: "admin", title: "Hunt overview", platform: "Web",
    steps: ["Open the Hunt admin tab."],
    expect: "Crew leaderboard and mission completion data render without error." },

  { id: "HUNT-01", section: "hunt-mobile", title: "Start a crew and answer a trivia mission", platform: "Web + Mobile",
    steps: ["Open The Hunt, name a crew, and create it.", "Open a trivia-type mission, pick an answer, submit."],
    expect: "Crew is created with you as a member; a correct answer awards points and marks the mission done." },
  { id: "HUNT-02", section: "hunt-mobile", title: "Leaderboard", platform: "Web + Mobile",
    steps: ["Switch to the Leaderboard tab."],
    expect: 'Crews are ranked by points, with yours marked "(you)."' },
];

export const UAT_DEMO_ACCOUNTS = [
  { role: "Fan", email: "fan@umoja.demo", notes: "No team, no roster ties" },
  { role: "Player", email: "player@umoja.demo", notes: "On Umoja FC roster, Men's Open, #21" },
  { role: "Captain", email: "captain@umoja.demo", notes: "Captains Umoja FC, Men's Open, #7" },
  { role: "Referee", email: "referee@umoja.demo", notes: "Assigned to the live seeded game" },
  { role: "Commissioner", email: "commissioner@umoja.demo", notes: "Sees all games & incidents" },
  { role: "Admin", email: "admin@umoja.demo", notes: "Full access" },
];
export const UAT_DEMO_PASSWORD = "Umoja2026!";
