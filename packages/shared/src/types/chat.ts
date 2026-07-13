export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}

export type ChatEscalationTopic =
  | "schedule_question"
  | "checkin_passes"
  | "lost_and_found"
  | "medical_safety"
  | "vendors_sponsors"
  | "something_else";

/**
 * "Still stuck? Ask an organizer" — created when the AI chatbot can't help;
 * lands in the same commissioner inbox as complaints/flags (source: "fan_message").
 */
export interface ChatEscalation {
  id: string;
  ticketNumber: string; // "UQ-114" style
  userUid: string;
  topic: ChatEscalationTopic;
  message: string;
  transcript: ChatMessage[];
  createdAt: number;
}
