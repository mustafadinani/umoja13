/**
 * Unified inbox model for the commissioner desk. Captain complaints, referee
 * flags, forfeit notices, fan "still stuck" messages, and volunteer messages
 * all land here with a `source` discriminator, sharing one status lifecycle
 * and one threaded conversation — matching how the prototype's commissioner
 * queue treats them.
 */
export type IncidentSource = "captain_complaint" | "referee_flag" | "forfeit" | "fan_message" | "volunteer_message";

export type IncidentStatus = "submitted" | "under_review" | "resolved" | "denied";

export type ComplaintType = "ineligible_player" | "game_related" | "other";

/** The three issue types a captain/coach picks from when filing a paid report — shown as the first step of the flow. */
export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  ineligible_player: "Player eligibility",
  game_related: "Game incident",
  other: "Other",
};

export interface IncidentMessage {
  id: string;
  from: "commissioner" | "filer";
  authorUid: string;
  text: string;
  createdAt: number;
}

/**
 * Recorded once the commissioner closes the case — a resolve/deny always
 * carries a response back to the filer, distinct from an ad-hoc thread
 * message (though the same response also gets appended to `thread` so the
 * filer sees it in-context alongside the rest of the conversation).
 */
export interface IncidentResolution {
  resolvedBy: string;
  resolvedByName: string;
  resolvedAt: number;
  response: string;
}

export interface Incident {
  id: string;
  caseNumber: string; // "UG-114" style
  source: IncidentSource;
  filedByUid: string;
  filedByName: string;
  filedByRole: string; // e.g. "captain, Queens United"
  complaintType?: ComplaintType; // captain_complaint / fan_message (paid report) only
  gameId?: string; // complaintType === "game_related"
  /** complaintType === "ineligible_player" only — the single player being reported. */
  playerKey?: string;
  playerName?: string;
  playerTeamId?: string;
  playerCategoryId?: string;
  text: string;
  status: IncidentStatus;
  thread: IncidentMessage[];
  resolution?: IncidentResolution;
  /** $35 review fee (captain complaints + report-to-commissioner). */
  fee?: {
    amountCents: number;
    stripeCheckoutSessionId?: string;
    /** Stripe PaymentIntent id (`pi_…`) once Checkout completes — confirmation of payment. */
    stripeConfirmationId?: string;
    stripePaymentIntentId?: string;
    paid: boolean;
    refunded: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * The one status vocabulary shown anywhere a case's status renders — "Pending"
 * (not "Submitted") is the label a filer/commissioner actually sees while a
 * paid case is waiting on the commissioner's attention.
 */
export function incidentStatusLabel(status: IncidentStatus): string {
  switch (status) {
    case "submitted":
      return "Pending";
    case "under_review":
      return "Under review";
    case "resolved":
      return "Resolved";
    case "denied":
      return "Denied";
  }
}

export type IncidentStatusTone = "success" | "warning" | "muted" | "danger";

export function incidentStatusTone(status: IncidentStatus): IncidentStatusTone {
  switch (status) {
    case "submitted":
      return "warning";
    case "under_review":
      return "muted";
    case "resolved":
      return "success";
    case "denied":
      return "danger";
  }
}
