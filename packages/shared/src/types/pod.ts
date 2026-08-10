/**
 * A Pod is a physical/organizational staffing zone for the event (e.g. "Fields
 * 1-3", "Stadium & Ops") — unlike TeamChannel/RoleChannel/UserChannel, which
 * are all one-way staff-broadcast-plus-reply, a Pod is a flat peer group:
 * admin, commissioner, referee, and volunteer members all post as equals,
 * since this org runs its tournament staff and volunteers as one population.
 * Membership (memberUids) is an explicit admin-curated roster, mirroring
 * teams.rosterUids rather than being derived from role or game assignment.
 */
/** Who can join a pod on their own. Missing/undefined behaves as "open" — every pod created before this field existed stays self-joinable. */
export type PodVisibility = "open" | "closed";

export interface Pod {
  id: string;
  name: string;
  /** Subset of FIELDS this pod covers. Optional — some pods (Entrance, Food Court) aren't field-based. */
  fields: string[];
  memberUids: string[];
  /** The one undeletable default pod every admin/commissioner/referee/volunteer is auto-added to on approval, so nobody is without a channel before pods are set up. */
  isGeneral?: boolean;
  /** "open" (default): any pod-eligible user can self-join via listOpenPods/joinPod. "closed": invite-only, staff must add members directly — never listed as open to join. */
  visibility?: PodVisibility;
  createdAt: number;
  updatedAt: number;
}

export const GENERAL_POD_ID = "general";

/** Defaults to open — a pod created before `visibility` existed, or with no explicit setting, stays self-joinable. */
export function isPodOpen(pod: Pick<Pod, "visibility">): boolean {
  return pod.visibility !== "closed";
}

export interface PodChannelMessage {
  id: string;
  authorUid: string;
  authorName: string;
  text: string;
  /** Optional photo/video attachment, uploaded to Storage client-side before this message is sent. */
  mediaUrl?: string;
  mediaType?: "photo" | "video";
  createdAt: number;
}

export interface PodChannel {
  id: string; // == podId
  podId: string;
  messages: PodChannelMessage[];
  updatedAt: number;
  /** uid -> ms timestamp each reader last opened this channel, for unread badges. */
  lastReadBy?: Record<string, number>;
}

/** First pod (if any) whose fields include the given field — used to auto-tag a Game with its pod at creation time. */
export function podForField(pods: Pick<Pod, "id" | "fields">[], field: string): string | undefined {
  return pods.find((p) => p.fields.includes(field))?.id;
}
