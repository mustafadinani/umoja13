/**
 * Umoja Games knowledge base — powers both the Ask Umoja AI assistant's
 * system prompt (packages/backend/functions/src/ai/chatAssistant.ts) and
 * the user-facing Info page/screen, so both stay in sync from one source.
 *
 * FAQ answers describe how THIS APP behaves (verified against its own
 * code) — safe to state as fact. Venue/local-area facts are sourced from
 * the venue's own site and public listings (cited per entry below) as of
 * July 2026; they can go stale, so the assistant is told to hedge on
 * anything time-sensitive (hours, phone numbers) and defer tournament-day
 * specifics (exact field/time for a given game) to the live Schedule.
 */

export interface FaqEntry {
  q: string;
  a: string;
}

export const UMOJA_FAQ: FaqEntry[] = [
  {
    q: "How does check-in work?",
    a: 'From My Umoja, tap your Tournament Pass, confirm "Is this you?" (or "I\'m checking in my child"), agree to the consent step, then submit a selfie and a photo of an ID. It\'s reviewed automatically; you can also choose "skip the AI check" for manual staff review instead, which may be slower.',
  },
  {
    q: "Can someone else check in my kid?",
    a: 'Yes — during check-in choose "I\'m checking in my child" instead of "This is me," then complete the same consent + photo steps on their behalf.',
  },
  {
    q: "I have more than one kid playing — how do I manage that?",
    a: 'My Umoja shows a "You" tab plus one tab per child. Each tab tracks that person\'s own team, check-in status, and volunteer shifts independently.',
  },
  {
    q: "How do I join a team?",
    a: 'From a fan account, find "Join a team," pick a category and team, enter a jersey number and your player name, and attach a registration photo.',
  },
  {
    q: "How do I volunteer?",
    a: "Sign up any time from My Umoja, or take the optional volunteer sign-up offered right after you check in. Once approved, your shifts show up under Volunteer with full shift details, and you can message staff directly about a specific shift.",
  },
  {
    q: "How do I message the organizers?",
    a: "Use the message icon next to the bell in My Umoja (mobile) or the nav bar (web) for a private thread with staff. It's separate from any team/role channel, so use it for anything personal or account-specific.",
  },
  {
    q: "How do I report an issue or file a complaint?",
    a: '"Report an issue" (any account) sends a message straight to the Commissioner and gives you a case number. Captains can also file a formal complaint (e.g. ineligible player) for a $35 review fee.',
  },
  {
    q: "Can I follow my team for updates?",
    a: "Yes, on web you can follow a team from its team page or your Fan dashboard to keep it pinned for quick access.",
  },
  {
    q: "What is the Hunt?",
    a: "A scavenger-hunt game open to anyone signed in — form a crew, complete trivia and photo/video missions around the tournament, and climb the leaderboard.",
  },
  {
    q: "Where do I see the schedule and standings?",
    a: "Game Day / Schedule shows games by category with live scores; Standings ranks teams by points, then goal difference, then goals scored within a category.",
  },
];

export interface ThingToDo {
  name: string;
  desc: string;
  category: "nature_outdoors" | "food" | "shopping";
}

/**
 * Sourced July 2026 from public listings for the Boyds/Germantown, MD
 * area around Maryland SoccerPlex — not Umoja-specific recommendations.
 * https://montgomeryparks.org/parks-and-trails/south-germantown-recreational-park/
 * https://www.tripadvisor.com/RestaurantsNear-g41015-d3370414-South_Germantown_Recreational_Park-Boyds_Montgomery_County_Maryland.html
 */
export const THINGS_TO_DO: ThingToDo[] = [
  { name: "South Germantown Recreational Park Splash Park", desc: "A water-maze splash park right in the same park as the SoccerPlex — an easy option between games.", category: "nature_outdoors" },
  { name: "Black Hill Regional Park", desc: "Nature center and trails on Little Seneca Lake, a few minutes from the venue — paddle boats, kayaks, and a kids' nature corner.", category: "nature_outdoors" },
  { name: "Germantown Town Center", desc: "The nearest shopping/dining hub, about 3 miles away, with a mix of casual restaurants.", category: "shopping" },
  { name: "Lakeforest Mall (Gaithersburg)", desc: "A larger mall a short drive away if you want more variety for a rain-delay or off day.", category: "shopping" },
  { name: "Local restaurants near the venue", desc: "Several casual spots cluster in nearby Boyds/Germantown — ask Ask Umoja or the organizers for something specific (cuisine, distance) and we'll point you the right way.", category: "food" },
];

/**
 * Sourced July 2026 from the venue's own site: https://mdsoccerplex.org/maryland-soccerplex/field-information/
 * and field map: https://mdsoccerplex.org/maryland-soccerplex/field-information/field-map/
 * Hours/phone can change — the assistant should hedge on these.
 */
export const VENUE_LOGISTICS = {
  fieldCount: 24,
  fieldLayout:
    "24 fields (a mix of Kentucky bluegrass, Bermudagrass, and synthetic turf) arranged in pods of 2-5 fields, each pod with its own nearby parking lot and restroom building.",
  parking:
    "Free parking in the lot closest to your pod of fields — lots do fill up during tournament weekends, so arrive early.",
  onSitePark:
    "The SoccerPlex sits inside South Germantown Recreational Park, which also has a splash park, mini golf, a driving range, an archery course, and a bike pump track if your group wants something to do between games.",
  hours: "Typically Sun 7am–10pm, Mon–Fri 9am–10pm, Sat 7am–10pm — tournament weekends may run on their own gate schedule, so confirm at the entrance.",
  phone: "(301) 528-1480",
};
