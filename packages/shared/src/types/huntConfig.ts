/**
 * The Hunt is built and seeded well before it should actually be visible —
 * this is the single switch that controls whether it's live for everyone.
 * Deliberately a manually-flipped flag (set via the `setHuntStarted`
 * callable), not an auto-open-at-a-date check: staff may need to delay past
 * the announced date, or the reverse never happens by design. `config/hunt`
 * is the one doc; see COLLECTIONS.config.
 */
export interface HuntConfig {
  started: boolean;
  startedAt?: number | null;
  startedByName?: string | null;
}

export const HUNT_CONFIG_DOC_ID = "hunt";
