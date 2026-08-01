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

export interface IncidentMessage {
  id: string;
  from: "commissioner" | "filer";
  authorUid: string;
  text: string;
  createdAt: number;
}

export interface Incident {
  id: string;
  caseNumber: string; // "UG-114" style
  source: IncidentSource;
  filedByUid: string;
  filedByName: string;
  filedByRole: string; // e.g. "captain, Queens United"
  complaintType?: ComplaintType; // captain_complaint only
  gameId?: string;
  /** fan_message only: links to the full chat transcript that led to this escalation. */
  chatEscalationId?: string;
  text: string;
  status: IncidentStatus;
  thread: IncidentMessage[];
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
