/**
 * A general tournament-prep checklist item scoped to a pod — distinct from
 * VolunteerTask, which is a scheduled, time/location-bound shift. A PodTask
 * has no time slot or location; it's just "does this need doing, is it
 * done," optionally assigned to one pod member but toggleable by any of
 * them (a shared team checklist), not gated to a single assignee the way a
 * shift is.
 */
export interface PodTask {
  id: string;
  podId: string;
  title: string;
  done: boolean;
  /** ISO date ("YYYY-MM-DD"), optional — a general prep item doesn't always have one. */
  dueDate?: string | null;
  assigneeUid?: string | null;
  assigneeName?: string | null;
  createdAt: number;
  createdBy: string;
}
