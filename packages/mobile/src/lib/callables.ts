import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  ChatMessage,
  ChatEscalationTopic,
  IncidentSource,
  ComplaintType,
  SponsorTier,
  SponsorshipDonorType,
  TeamChannelMessage,
  ChannelRole,
  RoleChannelMessage,
  UserChannelMessage,
  VolunteerTaskMessage,
} from "@umoja/shared";
import { app } from "./firebase";

const functions = getFunctions(app);

interface OcrResult {
  readScore: string | null;
  matchesConsole: boolean;
  note: string;
}

// The backend only reads role/text off each transcript entry (see
// packages/backend/functions/src/ai/chatAssistant.ts) — callers don't carry
// a message id/createdAt on in-flight chat state, so callables shouldn't
// require the full ChatMessage shape.
type TranscriptEntry = Pick<ChatMessage, "role" | "text">;

export const verifyCheckIn = httpsCallable<
  { checkInId: string },
  { status: "approved" | "rejected" | "admin_review"; reason?: string }
>(functions, "verifyCheckIn");

export const adminReviewCheckIn = httpsCallable<
  { checkInId: string; decision: "approve" | "reject" | "nullify" | "restore" },
  { status: string }
>(functions, "adminReviewCheckIn");

export const submitGameCard = httpsCallable<
  { gameId: string; photoUrl: string },
  { status: "awaiting_commissioner"; ocr: OcrResult }
>(functions, "submitGameCard");

export const fileIncident = httpsCallable<
  {
    source: IncidentSource;
    filedByName: string;
    filedByRole: string;
    complaintType?: ComplaintType;
    gameId?: string;
    text: string;
  },
  { id: string; caseNumber: string }
>(functions, "fileIncident");

export const callItFinal = httpsCallable<{ gameId: string }, { status: "final" }>(
  functions,
  "callItFinal"
);

export const askUmoja = httpsCallable<
  { transcript: TranscriptEntry[]; message: string },
  { reply: string }
>(functions, "askUmoja");

export const escalateChat = httpsCallable<
  { transcript: TranscriptEntry[]; topic: ChatEscalationTopic; message: string },
  { ticketNumber: string }
>(functions, "escalateChat");

export const createComplaintCheckout = httpsCallable<
  { incidentId: string; successUrl: string; cancelUrl: string },
  { checkoutUrl: string | null }
>(functions, "createComplaintCheckout");

export const createSponsorshipCheckout = httpsCallable<
  {
    tierId: SponsorTier;
    donorType: SponsorshipDonorType;
    donorName: string;
    email: string;
    phone?: string;
    companyLogoUrl?: string;
    customNote?: string;
    customAmountCents?: number;
    successUrl: string;
    cancelUrl: string;
  },
  { checkoutUrl: string | null; orderId: string }
>(functions, "createSponsorshipCheckout");

export const setUserRole = httpsCallable<
  { targetUid: string; roles: string[]; primaryRole: string },
  { ok: true }
>(functions, "setUserRole");

export const reviewVolunteerApplication = httpsCallable<
  { applicationId: string; decision: "approve" | "reject" },
  { status: "approved" | "rejected" }
>(functions, "reviewVolunteerApplication");

export const reviewChallengeSubmission = httpsCallable<
  { submissionId: string; decision: "approve" | "reject" },
  { status: "approved" | "rejected"; bonusPoints?: number; rank?: number }
>(functions, "reviewChallengeSubmission");

export const registerPushToken = httpsCallable<{ token: string | null }, { ok: true }>(
  functions,
  "registerPushToken"
);

export const sendTeamMessage = httpsCallable<
  { teamId: string; text: string },
  { message: TeamChannelMessage }
>(functions, "sendTeamMessage");

export const sendRoleMessage = httpsCallable<
  { role: ChannelRole; text: string },
  { message: RoleChannelMessage }
>(functions, "sendRoleMessage");

export const sendUserMessage = httpsCallable<
  { targetUid?: string; text: string },
  { message: UserChannelMessage }
>(functions, "sendUserMessage");

export const sendVolunteerTaskMessage = httpsCallable<
  { taskId: string; text: string },
  { message: VolunteerTaskMessage }
>(functions, "sendVolunteerTaskMessage");
