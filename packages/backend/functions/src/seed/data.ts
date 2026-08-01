import { CATEGORIES, SEED_SPONSORS, HUNT_MISSIONS } from "@umoja/shared";
import type { Team } from "@umoja/shared";

/**
 * Sample seed data for local dev / emulator use. Team names below (DMV
 * United, Lagos Legends, Silver Spring SC, Takoma Stars, Queens United,
 * Umoja FC, Harambee SC) are the real names used throughout the design
 * prototype/chat transcript. Other categories get generic placeholder
 * teams (2 each) so every category has something to browse — replace
 * with real registration data before go-live.
 */
const REAL_TEAM_NAMES: Record<string, { name: string; color: string }[]> = {
  "a71b598a-2b5e-4813-ac41-d610862a12de": [ // Men's Open
    { name: "DMV United", color: "#7B3FA4" },
    { name: "Lagos Legends", color: "#2E6BC0" },
    { name: "Umoja FC", color: "#9256C4" },
    { name: "Harambee SC", color: "#37B3A6" },
  ],
  "8df13d41-9f74-44c6-88fe-acaa9f3d7cf0": [ // Boy's 14 & Under
    { name: "Silver Spring SC", color: "#D8365D" },
    { name: "Takoma Stars", color: "#F2B95B" },
  ],
  "edc8142f-2ef0-4586-a576-2444875c4167": [{ name: "Queens United", color: "#6FC2B5" }, { name: "Zawadi FC", color: "#EF5A4C" }], // Women's Open
};

const PLACEHOLDER_COLORS = ["#7B3FA4", "#2E6BC0", "#37B3A6", "#D8365D", "#F2B95B", "#9256C4"];

export function seedTeams(): Omit<Team, "id">[] {
  const teams: Omit<Team, "id">[] = [];
  for (const cat of CATEGORIES) {
    const real = REAL_TEAM_NAMES[cat.id];
    const names = real ?? [
      { name: `${cat.label} Team A`, color: PLACEHOLDER_COLORS[0] },
      { name: `${cat.label} Team B`, color: PLACEHOLDER_COLORS[1] },
    ];
    names.forEach((t, i) => {
      teams.push({
        name: t.name,
        categoryId: cat.id,
        color: t.color,
        group: i % 2 === 0 ? "A" : "B",
        roster: [],
        stats: { wins: 0, draws: 0, losses: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 },
      });
    });
  }
  return teams;
}

export { CATEGORIES, SEED_SPONSORS, HUNT_MISSIONS };
