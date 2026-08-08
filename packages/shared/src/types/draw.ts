/**
 * Persisted state of one division's Live Draw — id == categoryId. Replaces
 * the old session-only in-memory draw + uploaded CSV shell: the full
 * schedule (day/time/field, and each group game's `homeDrawPos`/
 * `awayDrawPos`) is already seeded ahead of time, so a draw's only job is to
 * decide which real team occupies which 1-indexed draw position — publishing
 * then just backfills homeTeamId/awayTeamId on the category's existing
 * group-stage games, rather than creating new ones.
 */
export interface Draw {
  id: string; // == categoryId
  categoryId: string;
  /** Team ids in the order they were drawn — order[0] is draw position 1 ("Team 1" in the schedule), etc. */
  order: string[];
  /** Set once `order` has been used to backfill that category's group games. Publishing again (e.g. after a correction) is allowed and just re-runs the backfill — not a one-way gate. */
  publishedAt?: number;
  updatedAt: number;
}
