import { theme } from "./theme";

// A pod's icon/avatar color is derived from its id, not stored — so it stays
// stable across renders and reloads without needing a schema field, and two
// pods only clash if they happen to hash to the same bucket.
const PALETTE = [theme.color.purple, theme.color.teal, theme.color.blue, theme.color.orange, theme.color.pink, theme.color.gold] as const;

export function colorForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
