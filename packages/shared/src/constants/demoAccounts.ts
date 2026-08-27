/** Seed / UAT demo accounts — Auth + `umoja13-app` / users (not Outreach profiles). */
export const UAT_DEMO_PASSWORD = "Umoja2026!";

export const UAT_DEMO_ACCOUNTS = [
  { role: "Fan", email: "fan@umoja.demo", displayName: "Demo Fan", notes: "No team, no roster ties", roles: ["fan"] as const, primaryRole: "fan" as const },
  { role: "Player", email: "player@umoja.demo", displayName: "Demo Player", notes: "On Umoja FC roster, Men's Open, #21", roles: ["player"] as const, primaryRole: "player" as const },
  { role: "Captain", email: "captain@umoja.demo", displayName: "Demo Captain", notes: "Captains Umoja FC, Men's Open, #7", roles: ["player", "captain"] as const, primaryRole: "captain" as const },
  { role: "Referee", email: "referee@umoja.demo", displayName: "Demo Referee", notes: "Assigned to the live seeded game", roles: ["referee"] as const, primaryRole: "referee" as const },
  { role: "Commissioner", email: "commissioner@umoja.demo", displayName: "Demo Commissioner", notes: "Sees all games & incidents", roles: ["commissioner"] as const, primaryRole: "commissioner" as const },
  { role: "Admin", email: "admin@umoja.demo", displayName: "Demo Admin", notes: "Full access", roles: ["admin"] as const, primaryRole: "admin" as const },
] as const;
