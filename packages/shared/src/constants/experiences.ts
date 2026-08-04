/**
 * The "Experiences" tab content — travel logistics, local vendor
 * partnerships, and a Muslim family weekend guide for Umoja Games 2026 at
 * the Maryland SoccerPlex (Boyds, MD, Aug 14-16, 2026). Sourced from the
 * org's own "Umoja 13 Website" planning doc (flights/hotels/rental cars,
 * local vendor & experiences guide, Muslim family weekend guide) — static
 * reference content, not tournament-day data, so it lives here rather than
 * Firestore. Prices, hours, and partner codes can go stale season to
 * season; update this file when the org refreshes the doc.
 */

export interface AirportOption {
  code: string;
  name: string;
  driveTime: string;
  note?: string;
  airlines: string;
}

export interface AirlineDiscountCode {
  airline: string;
  code: string;
  instructions: string;
}

export interface TravelHotel {
  name: string;
  isHeadquarters?: boolean;
  pricePerNight: string;
  distance: string;
  driveTime: string;
  bedTypes: string;
  tax: string;
  perks: string;
}

export interface RentalCarDeal {
  company: string;
  code: string;
  instructions: string;
}

export interface BudgetTier {
  region: string;
  cities: string;
  travelTime: string;
  solo: string;
  family: string;
}

export const TRAVEL_GUIDE = {
  intro:
    "Get ready for an unforgettable weekend of soccer, community, and fun at the Maryland SoccerPlex in Boyds, Maryland! We've compiled everything you need — flights, hotels, rental cars, local experiences & halal food — so you can plan with confidence and focus on what matters most: the game, the memories, and the experience.",
  airports: [
    { code: "BWI", name: "Baltimore/Washington International", driveTime: "~35 min drive", note: "Best option for most travelers", airlines: "United, Southwest, Delta, American, JetBlue" },
    { code: "IAD", name: "Washington Dulles International", driveTime: "~30 min drive (closest!)", note: "Best for international travelers", airlines: "United, Air Canada, Lufthansa, many international airlines" },
    { code: "DCA", name: "Ronald Reagan Washington National", driveTime: "~45 min (I-495 N)", airlines: "United, American, Delta, Southwest" },
  ] as AirportOption[],
  internationalNote: "From Canada (Toronto): Fly direct to DCA or IAD via Air Canada, United, or Porter Airlines. ~1.5 hrs direct.",
  airlineDiscountCodes: [
    { airline: "United Airlines", code: "ZSED894981", instructions: "Use code in the Promotions & Certificates box when booking" },
    { airline: "Delta Airlines", code: "NY4PY", instructions: "Use code in the Meeting Code box when booking" },
    { airline: "Air Canada", code: "Y8TYGFB1", instructions: "Apply discount code at checkout for all Washington airports (DCA, IAD)" },
  ] as AirlineDiscountCode[],
  hotelDeposit: {
    note: "Book your stay at a Umoja partnered hotel and take advantage of our Give to Play option:",
    tiers: ["$50 if you register by April 14", "$75 if you register by July 14"],
    fullPrice: "If you choose not to stay at a Umoja partnered hotel, the full $100 registration fee will apply.",
  },
  hotelPricingNotes: [
    "Prices shown are negotiated group rates — attendees must book through the official Umoja booking link.",
    "Multiple price tiers reflect different room nights — book early for best availability.",
    "Tax rates vary by property — see each hotel for details.",
    "Please double check the dates for which you are booking, and read the Deposit and Cancellation Policies before confirming your reservation, as some rates may require advance payment and/or may be non-cancellable/non-refundable.",
  ],
  hotels: [
    { name: "DoubleTree by Hilton — Washington DC North/Gaithersburg", isHeadquarters: true, pricePerNight: "$169/night", distance: "8 miles", driveTime: "~14 min drive", bedTypes: "Double queens | Kings", tax: "TBD (working on confirming)", perks: "Free parking · Free breakfast for up to 4 guests per room · Indoor & outdoor pools · Fitness center · Full restaurant onsite" },
    { name: "Hampton Inn & Suites — Washington DC North/Gaithersburg", pricePerNight: "$159/night", distance: "6 miles", driveTime: "~13 min drive", bedTypes: "Double queens", tax: "15% per night", perks: "Free parking · Free breakfast for up to 4 guests per room · Indoor pool · Fitness center" },
    { name: "Gaithersburg Marriott Washingtonian Center", pricePerNight: "$169/night", distance: "~9 miles", driveTime: "~16 min drive", bedTypes: "Double fulls | Kings", tax: "15% per night", perks: "Fitness center · Full restaurant onsite" },
    { name: "SpringHill Suites by Marriott — Gaithersburg", pricePerNight: "$109 (King) – $129 (Queens) per night", distance: "8 miles", driveTime: "~16 min drive", bedTypes: "Double queens | Kings", tax: "15% per night", perks: "Free parking · Free breakfast for up to 4 guests per room · Fitness center" },
  ] as TravelHotel[],
  rentalCars: [
    { company: "Hertz", code: "CDP 2313064", instructions: "Use offer code in the CDP box when booking at hertz.com" },
    { company: "Avis", code: "J157617", instructions: "Use discount code in the AWD# box when booking at avis.com" },
    { company: "Budget", code: "S274070", instructions: "Use offer code in the BCD Code box when booking at budget.com" },
    { company: "Enterprise", code: "SMB575U", instructions: "Apply Corporate Account Number at checkout" },
  ] as RentalCarDeal[],
  budgetNote: "These numbers are estimates only — actual costs will vary based on when you book and where you're traveling from. Hotel estimates assume 4-5 nights at ~$150/night average. Book early for the best rates!",
  budgetTiers: [
    { region: "Driving Distance", cities: "Washington DC · Baltimore · Northern Virginia · Richmond VA · Wilmington DE", travelTime: "Less than 2 hours away — just hop in the car, no flights needed", solo: "$600 hotel + gas = ~$650", family: "$600 hotel + gas = ~$650" },
    { region: "Northeast & Mid-Atlantic", cities: "New York City · New Jersey · Philadelphia · Pittsburgh · Boston · Connecticut · Charlotte · Raleigh-Durham · Columbus OH", travelTime: "2.5 – 7 hours away — drive, charter bus, or short flight", solo: "~$40–150 bus OR ~$300 flight + $600 hotel = ~$640–900", family: "~$160–600 bus OR ~$1,200 flights + $600 hotel = ~$760–1,800" },
    { region: "Midwest & South", cities: "Chicago IL · Detroit/Dearborn MI · Atlanta GA · Minneapolis MN · Houston TX · Dallas–Fort Worth TX", travelTime: "1.5 – 3 hour flight — short direct flights available from most major airports", solo: "~$200–350 flight + $600 hotel = ~$800–950", family: "~$800–1,400 flights + $600 hotel = ~$1,400–2,000" },
    { region: "West Coast & Canada", cities: "Los Angeles CA · San Francisco CA · Phoenix AZ · Toronto ON · Montreal QC · Ottawa ON", travelTime: "4.5 – 6 hour flight — worth every mile, insha'Allah", solo: "~$350–500 flight + $600 hotel = ~$950–1,100", family: "~$1,400–2,000 flights + $600 hotel = ~$2,000–2,600" },
  ] as BudgetTier[],
};

export interface LocalExperience {
  emoji: string;
  name: string;
  city: string;
  tagline: string;
  address: string;
  distance: string;
  driveTime: string;
  hours?: string;
  pricing?: string;
  website?: string;
  description: string;
  umojaOffer?: string;
  featured?: boolean;
}

/** Sorted closest to farthest from Maryland SoccerPlex, matching the source guide. */
export const LOCAL_EXPERIENCES: LocalExperience[] = [
  {
    emoji: "🏞️",
    name: "Black Hill Regional Park",
    city: "Boyds, MD",
    tagline: "Stunning 1,800-acre park right next to the SoccerPlex — lake, trails & boat rentals",
    address: "20930 Lake Ridge Drive, Boyds, MD 20841",
    distance: "~2 miles",
    driveTime: "~5 min drive",
    hours: "Daily 6AM–8PM (seasonal variation possible)",
    pricing: "Free entry to park | Boat rentals available (fees apply)",
    website: "montgomeryparks.org/parks-and-trails/black-hill-regional-park",
    description: "A breathtaking 1,800-acre park sitting just half a mile from the Maryland SoccerPlex — the nearest green space to the tournament. The park surrounds Little Seneca Lake, offering scenic walking and biking trails, fishing piers, kayak and canoe rentals, and stunning waterfront views. A perfect spot to unwind between games and enjoy a slice of Maryland's natural beauty with the whole family.",
  },
  {
    emoji: "🍎",
    name: "Butler's Orchard",
    city: "Germantown, MD",
    tagline: "75-year-old family farm with pick-your-own produce, hayrides & farm market",
    address: "22200 Davis Mill Road, Germantown, MD 20876",
    distance: "~3 miles",
    driveTime: "~8 min drive",
    hours: "Daily 9AM–5PM (open August — seasonal confirmation recommended)",
    website: "butlersorchard.com",
    description: "A beloved 75-year-old family farm just 3 miles from the SoccerPlex — the closest attraction to the tournament. In August, pick sun-ripened peaches, blackberries, and tomatoes straight from the fields. The farm also features sunflower fields perfect for family photos, a full farm market with fresh produce and baked goods, hayrides, and a country store.",
    umojaOffer: "40% off admission (Sunflower Spectacular/Sunset Social tickets, reserved days, online only) — code UMOJA26. Discount on tickets only, not picking containers or extras.",
    featured: true,
  },
  {
    emoji: "⛳",
    name: "Topgolf",
    city: "Germantown, MD",
    tagline: "High-tech golf entertainment with 80 climate-controlled bays & full food menu",
    address: "20505 Seneca Meadows Pkwy, Germantown, MD 20876",
    distance: "~4 miles",
    driveTime: "~8 min drive",
    pricing: "~$25–$55/hour per bay (up to 6 players) — varies by time",
    website: "topgolf.com/us/germantown",
    description: "A premium entertainment complex with 80 climate-controlled hitting bays across three levels. Gamified technology tracks every shot in real time — no golf experience needed. A full food and beverage menu is served directly to your bay, each bay fits up to 6 players, and the whole venue is open late.",
  },
  {
    emoji: "🌊",
    name: "Seneca Creek State Park",
    city: "Gaithersburg, MD",
    tagline: "6,300-acre Maryland state park with lake, trails, boat rentals & picnic shelters",
    address: "11950 Clopper Road, Gaithersburg, MD 20878",
    distance: "~6 miles",
    driveTime: "~12 min drive",
    pricing: "Free park entry | Boat rentals from ~$12–$25/hour",
    website: "dnr.maryland.gov/publiclands/pages/central/senecacreek",
    description: "A 6,300-acre Maryland state park just minutes from the SoccerPlex, centered around the beautiful Clopper Lake. Enjoy paddleboat, rowboat, and kayak rentals, scenic hiking trails through forest and meadow, large covered picnic shelters ideal for group gatherings, and open green spaces perfect for informal kickarounds.",
  },
  {
    emoji: "🔑",
    name: "Red Door Escape Room",
    city: "Rio Washingtonian, Gaithersburg, MD",
    tagline: "Immersive escape room experiences for families, friends & teams",
    address: "9811 Washingtonian Blvd, Gaithersburg, MD 20878",
    distance: "~7 miles",
    driveTime: "~12 min drive",
    pricing: "~$28–$35 per person depending on room and time",
    website: "reddoorescape.com",
    description: "Multiple fully themed room challenges for groups of 2–8 players. Teams solve puzzles, uncover clues, and unlock hidden doors within 60 minutes — a perfect team-bonding activity for families, friend groups, and soccer teams. No prior experience required. Advance booking is strongly recommended for weekend slots.",
    umojaOffer: "20% off for Umoja groups — use code UMOJA",
  },
  {
    emoji: "🎭",
    name: "Me Land",
    city: "Gaithersburg, MD",
    tagline: "Award-winning indoor playground where play becomes powerful",
    address: "831 Russell Ave, Gaithersburg, MD 20879",
    distance: "~8 miles",
    driveTime: "~14 min drive",
    pricing: "~$14–$18 per child | Adults free with paid child",
    website: "melandplay.com",
    description: "An award-winning, imaginative indoor playground designed for children up to age 12, featuring role-play zones modeled after real-world careers — a hospital, grocery store, media studio, and more. Best suited for children ages 2–12.",
  },
  {
    emoji: "🔫",
    name: "ShadowLand Laser Adventures",
    city: "Gaithersburg, MD",
    tagline: "Multi-level laser tag arena, arcade games, bumper cars & mini bowling",
    address: "801 Russell Ave, Gaithersburg, MD 20879",
    distance: "~8 miles",
    driveTime: "~14 min drive",
    pricing: "Laser tag from ~$10/session | Packages available",
    website: "shadowlandadventures.com",
    description: "One of the most exciting multi-level laser tag arenas in the DMV, featuring fog machines, black lights, and an immersive sci-fi battlefield spanning multiple floors. Beyond laser tag, ShadowLand offers bumper cars, mini bowling, and a full arcade floor. Walk-in friendly with no reservations required for standard sessions.",
    umojaOffer: "$25 Umoja Special — Double Play Laser Tag + 25 Arcade Credits + 16oz Fountain Drink + Bag of Popcorn. Valid Aug 13–17, 2026 only. Present coupon (printed or on phone) at purchase. Max 5 per transaction; cannot combine with other discounts or booked events.",
  },
  {
    emoji: "🪂",
    name: "iFLY Indoor Skydiving",
    city: "Montgomery, MD",
    tagline: "Real indoor skydiving in a vertical wind tunnel — no experience needed",
    address: "702 Russell Ave, Gaithersburg, MD 20877",
    distance: "~8 miles",
    driveTime: "~14 min drive",
    pricing: "From ~$59–$89 per person — includes 2 flights + gear + instruction",
    website: "iflyworld.com/montgomery",
    description: "Real indoor skydiving inside a state-of-the-art vertical wind tunnel. Certified professional instructors guide every participant — from first-timers to experienced flyers — through a safe, exhilarating free-fall experience. Suitable for ages 3 and up.",
  },
  {
    emoji: "🤸",
    name: "Sky Zone",
    city: "Gaithersburg, MD",
    tagline: "The original trampoline park — open jump, dodgeball, foam zone & ninja course",
    address: "700 N Frederick Ave, Gaithersburg, MD 20879",
    distance: "~8 miles",
    driveTime: "~14 min drive",
    pricing: "From ~$17–$26 for 60–90 min jump session",
    website: "skyzone.com/gaithersburg",
    description: "The DMV's original trampoline park, featuring wall-to-wall trampolines, open jump courts, dodgeball arenas, a foam pit, slam dunk stations, and a ninja warrior obstacle course. Dedicated Toddler Time sessions make it welcoming for younger children too. Party packages and group booking options are available.",
  },
  {
    emoji: "👻",
    name: "Monster Mini Golf",
    city: "Gaithersburg, MD",
    tagline: "Glow-in-the-dark indoor mini golf with monster-themed animated holes",
    address: "701 Russell Ave, Gaithersburg, MD 20877 (Inside Lakeforest Mall)",
    distance: "~8 miles",
    driveTime: "~14 min drive",
    pricing: "~$10–$12 per person | Birthday and group packages available",
    website: "monsterminigolf.com/gaithersburg",
    description: "An indoor, glow-in-the-dark mini golf experience set inside a spooky monster-themed wonderland full of black-light art, animated creatures, and eerie surprises. 18 unique themed holes — no skill required. Located inside Lakeforest Mall with easy parking and nearby dining.",
    umojaOffer: "Exclusive group deal + online booking — use promo code UMOJA at checkout",
  },
  {
    emoji: "🎳",
    name: "Lucky Strike Bowling",
    city: "Gaithersburg, MD",
    tagline: "Upscale bowling, arcade games & entertainment for the whole family",
    address: "20 Courthouse Square, Gaithersburg, MD 20878",
    distance: "~9 miles",
    driveTime: "~15 min drive",
    pricing: "Bowling from ~$6–$9 per person per game | Shoe rental extra",
    website: "luckystrike.com",
    description: "Originally Bowlero Gaithersburg — an upscale bowling and entertainment center in downtown Gaithersburg. Premium bowling lanes, a full arcade floor with redemption games, billiards, and a food and beverage menu. Great for large groups with lots of lanes and space.",
  },
  {
    emoji: "🥷",
    name: "ZavaZone",
    city: "Rockville, MD",
    tagline: "Trampoline park, ninja warrior course, extreme dodgeball & more",
    address: "15751 Shady Grove Road, Rockville, MD 20850",
    distance: "~12 miles",
    driveTime: "~20 min drive",
    pricing: "1hr $25.50 · 90min $35.50 · 2hr $45.50 · 3hr $55.50 · Socks $5.00",
    website: "zavazone.com",
    description: "One of the DMV's most loved trampoline and adventure parks, packed with open jump courts, foam pits, a ninja warrior obstacle course, extreme dodgeball arenas, SkyClimber rock walls, and the SkyRider zip line. Suitable for all ages, with dedicated areas for toddlers.",
    umojaOffer: "15% off walk-in tickets, Aug 14–16, 2026 only — inform the front desk you're with Umoja (walk-ins only, not available online).",
  },
  {
    emoji: "🌳",
    name: "The Adventure Park at Sandy Spring",
    city: "Sandy Spring, MD",
    tagline: "Treetop zip lines & aerial obstacle courses through Maryland forest",
    address: "16701 Norwood Road, Sandy Spring, MD 20860",
    distance: "~19 miles",
    driveTime: "~28 min drive",
    pricing: "Varies by trail level — check website for current rates",
    website: "sandyspringadventurepark.com",
    description: "Maryland's premier outdoor treetop adventure destination, set in a stunning natural forest with 10+ trail levels of zip lines and aerial obstacle courses for all ages and skill levels. Certified guides and full safety equipment provided. Suitable for ages 7 and up.",
  },
  {
    emoji: "🔬",
    name: "KID Museum",
    city: "Bethesda, MD",
    tagline: "Hands-on STEM, art & culture museum inspiring the next generation",
    address: "4811 Rugby Ave, Bethesda, MD 20814",
    distance: "~20 miles",
    driveTime: "~30 min drive",
    pricing: "~$15 per person | Under 1 year free | Group rates available",
    website: "kid-museum.org",
    description: "An innovative, hands-on museum inspiring young people through STEM exploration, artistic creation, and global cultural discovery. Professional-grade makerspace labs with 3D printers, laser cutters, and engineering tools sit alongside interactive invention workshops. Designed for children ages 5–14.",
    umojaOffer: "$10 tickets (normally $15) — valid Aug 16 only — code UMOJA2026",
  },
  {
    emoji: "🛡️",
    name: "Urban Air Adventure Park",
    city: "Frederick, MD",
    tagline: "Indoor sky-high fun — trampolines, climbing walls, zip lines & more",
    address: "5765 Spectrum Drive, Frederick, MD 21703",
    distance: "~28 miles",
    driveTime: "~35 min drive",
    website: "urbanairparks.com/parks/frederick",
    description: "One of the most popular indoor adventure venues in the DMV, spanning over 40,000 sq ft with trampolines, ropes courses, climbing walls, bumper cars, a warrior obstacle course, and the iconic Sky Rider zip line. Fully air-conditioned. Food and snack options are available on-site.",
    umojaOffer: "Spirit Night (Aug 14, 2026, 10AM–9PM) — discounted attraction bands: Platinum $32.99 (retail $39.99) · Ultimate $27.99 (retail $32.99) · Deluxe $22.99 (retail $29.99). No upfront fees — mention Umoja Outreach Foundation at the front desk. Socks not included. 20% of Spirit Night band sales donated back to Umoja.",
  },
];

export interface Mosque {
  name: string;
  tagline: string;
  address: string;
  distance: string;
  driveTime: string;
  website: string;
  description: string;
}

export interface HalalMarket {
  name: string;
  rating?: string;
  type: string;
  address: string;
  distance: string;
  driveTime: string;
  hours: string;
  phone: string;
}

export interface HalalRestaurant {
  name: string;
  distance: string;
  locations: string[];
  website: string;
  closest?: boolean;
}

export const MUSLIM_FAMILY_GUIDE = {
  intro: "Your guide to a blessed, halal weekend — Mosques, halal restaurants, and grocery stores near the SoccerPlex.",
  stats: { mosques: 2, restaurants: 7, markets: 3 },
  prayerTimesNote: "Estimated times for August 14–16, 2026 (Gaithersburg, MD). Times above are estimates — please verify exact times at islamicfinder.org or your local mosque closer to the event date.",
  prayerTimes: {
    fajr: "~5:15 AM",
    dhuhr: "~1:10 PM",
    asr: "~4:50 PM",
    maghrib: "~8:00 PM",
    isha: "~9:20 PM",
    jumuah: "Fri Aug 14 — check mosque for exact time",
  },
  mosques: [
    {
      name: "Islamic Center of Maryland (ICM)",
      tagline: "Full-service mosque — 5 daily prayers + Jumu'ah Friday prayer",
      address: "19401 Woodfield School Road, Gaithersburg, MD 20882",
      distance: "~6 miles",
      driveTime: "~12 min drive",
      website: "icmd.org",
      description: "Established Islamic center offering 5 daily prayers and Jumu'ah — check icmd.org for exact August 2026 times.",
    },
    {
      name: "Islamic Society of Germantown (ISG)",
      tagline: "Community mosque — Friday Jumu'ah + daily prayers",
      address: "810 South Frederick Avenue, Gaithersburg, MD 20877",
      distance: "~8 miles",
      driveTime: "~14 min drive",
      website: "facebook.com/ISGtown",
      description: "Community-focused mosque offering Jumu'ah and daily prayers — check ISG social pages for exact August 2026 times.",
    },
  ] as Mosque[],
  halalMarkets: [
    { name: "Germantown Halal Meat & Grocery", rating: "4.9", type: "Halal butcher + grocery — South Asian & Middle Eastern", address: "12615-C Wisteria Dr, Germantown, MD 20874", distance: "~4.8 miles", driveTime: "~9–12 min drive", hours: "Mon–Thu 10AM–8PM · Fri 10AM–9PM · Sat 9AM–9PM · Sun 10AM–8PM", phone: "(301) 972-0808" },
    { name: "Zam Zam Market", type: "Halal grocery — Middle Eastern & South Asian", address: "9017 Gaither Rd, Gaithersburg, MD 20877", distance: "~7.5 miles", driveTime: "~13–16 min drive", hours: "Mon–Sat 9:00AM–8:30PM · Sun 10:00AM–7:00PM", phone: "(301) 840-2225" },
    { name: "Gourmet Bazaar", type: "Mediterranean grocery — Persian, Lebanese & Middle Eastern", address: "736-A Rockville Pike, Rockville, MD 20852", distance: "~9.5 miles", driveTime: "~15–18 min drive", hours: "Mon–Sat 9AM–9PM · Sun 9AM–7PM", phone: "(301) 838-3031" },
  ] as HalalMarket[],
  halalRestaurants: [
    { name: "Naz's Halal Food", closest: true, distance: "~3–5 mi (Germantown) — CLOSEST!", locations: ["13025 Wisteria Dr, Germantown, MD", "522 N Frederick Ave, Gaithersburg, MD", "1040 Rockville Pike, Rockville, MD", "11209 New Hampshire Ave, Silver Spring, MD"], website: "nazshalal.com" },
    { name: "Miyaji Kebab & Rumali Rolls", closest: true, distance: "~5 mi", locations: ["674 Quince Orchard Rd, Gaithersburg, MD 20878"], website: "yelp.com (search miyaji-kebab)" },
    { name: "Kabob N Karahi", closest: true, distance: "~5 mi", locations: ["18232 Flower Hill Way, Gaithersburg, MD 20879"], website: "kabobnkarahi.com" },
    { name: "Mezeh", closest: true, distance: "~3–10 mi", locations: ["19810 Century Blvd, Germantown, MD 20874", "262 Crown Park Ave, Gaithersburg, MD 20878", "11508 Schuylkill Rd, Rockville, MD 20852", "13645 Connecticut Ave, Aspen Hill, MD 20906"], website: "mezeh.com" },
    { name: "The Halal Guys", distance: "~10–15 mi", locations: ["891 Rockville Pike, Rockville, MD 20852", "4915 Elm St, Bethesda, MD 20814"], website: "thehalalguys.com" },
    { name: "Dolan (Uyghur)", distance: "~10 mi", locations: ["20-A Maryland Ave, Rockville, MD 20850"], website: "dolanuyghur.com" },
    { name: "Grill Kabob", distance: "~10 mi", locations: ["1409 Research Blvd, Rockville, MD 20850"], website: "clover.com/grill-kabob" },
  ] as HalalRestaurant[],
};
