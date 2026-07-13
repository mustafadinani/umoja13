import type { HuntMission } from "../types/hunt.js";

/**
 * The real 2026 Umoja Games Scavenger Hunt mission guide, transcribed verbatim
 * from project/uploads/Umoja Games 2026 Scavenger Hunt FINAL .pdf.
 * 30 numbered missions across 3 days + 15 lettered "Open Missions" (day: "open").
 * This is the authoritative content — supersedes the mobile prototype's
 * 23-mission demo subset.
 */
export const HUNT_MISSIONS: HuntMission[] = [
  // Day 1 -- Opening Day: "Let's Get It Started" (Thu Aug 14)
  { id: "m1", type: "photo", title: "The Sportsmanship Handshake", subtitle: "Day 1", description: "Snap a photo of a genuine handshake between two players from opposing teams after a match.", points: 100, day: "1" },
  { id: "m2", type: "video", title: "Team Chant Challenge", subtitle: "Day 1", description: "Create an original chant for your soccer team and record your entire squad performing it together. Energy and creativity earn bonus points.", points: 150, day: "1" },
  { id: "m3", type: "photo", title: "Breakfast of Champions", subtitle: "Day 1", description: "Take a photo of your breakfast before your first match.", points: 75, day: "1" },
  { id: "m4", type: "photo", title: "Snap with Mr. Umoji", subtitle: "Day 1", description: "Find the mascot \"Mr. Umoji\" somewhere at SoccerPlex and take a selfie with him.", points: 75, day: "1" },
  { id: "m5", type: "photo", title: "Salaam a Stranger", subtitle: "Day 1", description: "Go up to someone you haven't met and give them a warm Salaam; take a selfie together.", points: 100, day: "1" },
  { id: "m6", type: "gps", title: "Welcome to SoccerPlex", subtitle: "Day 1", description: "Check in at the main entrance (18031 Central Park Circle, Boyds, MD).", points: 100, day: "1" },
  { id: "m7", type: "video", title: "Commentator Mode: Activated", subtitle: "Day 1", description: "Record 30 seconds of live match action with sports commentary in the background.", points: 125, day: "1" },
  { id: "m8", type: "trivia", title: "Soccer IQ Test", subtitle: "Day 1", description: "Which country has won the most FIFA World Cup titles?", points: 100, day: "1", options: ["Brazil", "Germany", "Italy", "Argentina"], answerIndex: 0 },
  { id: "m9", type: "photo", title: "Hype a Stranger", subtitle: "Day 1", description: "Give a genuine compliment or high five to someone you don't know; snap a photo.", points: 100, day: "1" },
  { id: "m10", type: "trivia", title: "Islamic Trivia Challenge", subtitle: "Day 1", description: "What does 'Umoja' mean in Swahili?", points: 100, day: "1", options: ["Unity", "Peace", "Faith", "Strength"], answerIndex: 0 },

  // Day 2 -- Tournament Day: "Match Intensity" (Fri Aug 15)
  { id: "m11", type: "gps", title: "Find the Umoja Booth", subtitle: "Day 2", description: "Navigate to the official Umoja booth and check in on the app; say salam to the team.", points: 100, day: "2" },
  { id: "m12", type: "video", title: "Penalty Kick Drama", subtitle: "Day 2", description: "Capture video of a player taking a penalty kick -- bonus for the goalkeeper's reaction.", points: 150, day: "2" },
  { id: "m13", type: "trivia", title: "Maryland Soccer Trivia", subtitle: "Day 2", description: "Which Maryland city is home to D.C. United's MLS rival in the state?", points: 100, day: "2", options: ["Annapolis", "Baltimore", "Rockville", "Frederick"], answerIndex: 1 },
  { id: "m14", type: "photo", title: "Jersey Name Twins", subtitle: "Day 2", description: "Find two players whose jerseys share the same name; photo side by side.", points: 100, day: "2" },
  { id: "m15", type: "video", title: "5 Keep-Ups or More", subtitle: "Day 2", description: "Record yourself doing at least 5 consecutive keep-ups without dropping the ball (no hands after first touch).", points: 175, day: "2" },
  { id: "m16", type: "photo", title: "Visit the Mosque", subtitle: "Day 2", description: "Visit a nearby mosque during the tournament weekend and take a selfie in the prayer area.", points: 150, day: "2" },
  { id: "m17", type: "qr", title: "Sponsor Shoutout Station", subtitle: "Day 2", description: "Scan the QR code at the Umoja sponsor booth to learn about the organizations making the tournament possible and unlock the next clue.", points: 75, day: "2" },
  { id: "m18", type: "video", title: "Soccer Trick Shot", subtitle: "Day 2", description: "Record your best move: rainbow flick, elastico, step-over, etc.", points: 150, day: "2" },
  { id: "m19", type: "photo", title: "Team Huddle", subtitle: "Day 2", description: "Capture a soccer team doing a full group huddle.", points: 100, day: "2" },
  { id: "m20", type: "text", title: "Dua Before the Match", subtitle: "Day 2", description: "Share the dua or dhikr that helps you stay focused and calm before a big match.", points: 100, day: "2" },

  // Day 3 -- Final Day: "Finish Strong" (Sat Aug 16)
  { id: "m21", type: "photo", title: "Before & After the Battle", subtitle: "Day 3", description: "Photos of a player before (fresh) and after (exhausted/proud) their match.", points: 100, day: "3" },
  { id: "m22", type: "qr", title: "Umoja 13 Location Guess", subtitle: "Day 3", description: "Scan the QR at the Umoja booth to submit a guess for next year's (\"Umoja 13\") tournament location.", points: 75, day: "3" },
  { id: "m23", type: "mini_game", title: "Rock, Paper, Scissors Gauntlet", subtitle: "Day 3", description: "Challenge a yellow-vest volunteer to RPS, best of 3 -- loser does 10 squats on camera (ask permission first).", points: 150, day: "3" },
  { id: "m24", type: "video", title: "UMOJA Human Spelling", subtitle: "Day 3", description: "Spell \"U-M-O-J-A\" with teammates lying on the field; record an aerial/wide-angle video.", points: 175, day: "3" },
  { id: "m25", type: "trivia", title: "Founding Members Quiz", subtitle: "Day 3", description: "Approximately how many tournaments had Umoja held before 2026?", points: 125, day: "3", options: ["5", "8", "10", "12"], answerIndex: 1 },
  { id: "m26", type: "photo", title: "Your Hype Outfit", subtitle: "Day 3", description: "Photo of your Day 3 tournament outfit.", points: 100, day: "3" },
  { id: "m27", type: "video", title: "Superhero of the Pitch", subtitle: "Day 3", description: "Make a cape, strike a superhero pose, declare \"Never fear, [superhero name] is here!\"", points: 150, day: "3" },
  { id: "m28", type: "text", title: "Multilingual Thank You", subtitle: "Day 3", description: "In a non-English language, type \"Thank you for making the soccer tournament possible!\" and note the language used.", points: 100, day: "3" },
  { id: "m29", type: "photo", title: "Umoja Veteran", subtitle: "Day 3", description: "Find someone who's attended 3+ Umoja tournaments; selfie + their favorite Umoja memory in the caption.", points: 100, day: "3" },
  { id: "m30", type: "photo", title: "Sadaqah Moment", subtitle: "Day 3", description: "Drop a dollar in the donation box at the Umoja booth to support families in the community; photo.", points: 75, day: "3" },

  // Open Missions -- available all three days
  { id: "mA", type: "photo", title: "Subhanallah Sunset", subtitle: "Open mission", description: "Photo of a stunning sunset anywhere during the weekend.", points: 75, day: "open" },
  { id: "mB", type: "photo", title: "Favorite Vendor Bite", subtitle: "Open mission", description: "Photo of yourself eating your favorite vendor food.", points: 100, day: "open" },
  { id: "mC", type: "video", title: "Movie Scene Reenactment", subtitle: "Open mission", description: "Reenact a scene from a favorite soccer/sports movie (30 sec max); name the movie in the caption.", points: 150, day: "open" },
  { id: "mD", type: "photo", title: "Stretch It Out", subtitle: "Open mission", description: "Photo of your favorite pre-match warm-up stretch/conditioning move.", points: 75, day: "open" },
  { id: "mE", type: "video", title: "Fan Reaction Reel", subtitle: "Open mission", description: "Record your wildest reactions to an imagined saved shot AND goal (max 30 sec).", points: 125, day: "open" },
  { id: "mF", type: "video", title: "Elaborate Handshake", subtitle: "Open mission", description: "Invent and record a creative multi-step handshake with a teammate/friend.", points: 100, day: "open" },
  { id: "mG", type: "photo", title: "Butler's Orchard Visit", subtitle: "Open mission", description: "Visit Butler's Orchard (a 75-year-old Maryland farm, ~3 miles from SoccerPlex); photo of something picked/bought.", points: 125, day: "open" },
  { id: "mH", type: "photo", title: "Explore a Local Attraction", subtitle: "Open mission", description: "Visit a recommended local spot: ZavaZone, Monster Mini Golf, Red Door Escape Room, ShadowLand, or Sky Zone; photo.", points: 125, day: "open" },
  { id: "mI", type: "video", title: "Duas Under Pressure", subtitle: "Open mission", description: "Share a tip/dua/breathing exercise to stay cool-headed before a big match.", points: 125, day: "open" },
  { id: "mJ", type: "photo", title: "Smiling is Sunnah!", subtitle: "Open mission", description: "Give someone your warmest smile; photo of the moment.", points: 75, day: "open" },
  { id: "mK", type: "photo", title: "Maryland Nature", subtitle: "Open mission", description: "Visit Seneca Creek State Park or photograph Maryland nature; caption with what you love about being there.", points: 100, day: "open" },
  { id: "mL", type: "video", title: "Hot Take Alert", subtitle: "Open mission", description: "Share a debatable soccer opinion (e.g. the GOAT debate) on video.", points: 100, day: "open" },
  { id: "mM", type: "photo", title: "Pre-Game Stretch", subtitle: "Open mission", description: "Photo of your favorite stretch/conditioning move.", points: 75, day: "open" },
  { id: "mN", type: "photo", title: "Unique Compliment", subtitle: "Open mission", description: "Give someone a unique, creative compliment (e.g. \"Mashallah, you look like someone who always makes their bed!\"); record/photograph it.", points: 125, day: "open" },
  { id: "mO", type: "text", title: "Guess Umoja 14 Location", subtitle: "Open mission", description: "Submit your best guess for where \"Umoja 14\" will be held.", points: 75, day: "open" },
];
