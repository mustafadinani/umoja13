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
  Pod,
  PodChannelMessage,
  PodTaskMessage,
} from "@umoja/shared";
import { app } from "./firebase";

const functions = getFunctions(app, "us-central1");

// The backend only reads role/text off each transcript entry (see
// packages/backend/functions/src/ai/chatAssistant.ts) — callers don't carry
// a message id/createdAt on in-flight chat state, so callables shouldn't
// require the full ChatMessage shape.
type TranscriptEntry = Pick<ChatMessage, "role" | "text">;

export const adminReviewCheckIn = httpsCallable<
  { checkInId: string; decision: "approve" | "reject" | "nullify" | "restore" },
  { status: string }
>(functions, "adminReviewCheckIn");

export const submitGameCard = httpsCallable<
  { gameId: string; photoUrl: string },
  { status: "awaiting_commissioner" }
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
  { checkoutUrl: string | null; sessionId: string }
>(functions, "createComplaintCheckout");

export const confirmIncidentPayment = httpsCallable<
  { incidentId: string; sessionId: string },
  { paid: boolean; stripeConfirmationId: string; alreadyRecorded: boolean }
>(functions, "confirmIncidentPayment");

export const createReportFeeIntent = httpsCallable<
  Record<string, never>,
  { clientSecret: string; paymentIntentId: string; publishableKey: string; amountCents: number }
>(functions, "createReportFeeIntent");

export const filePaidReport = httpsCallable<
  {
    text: string;
    filedByName: string;
    filedByRole: string;
    paymentIntentId: string;
    source?: "fan_message" | "captain_complaint";
    complaintType?: string;
  },
  { id: string; caseNumber: string; stripeConfirmationId: string }
>(functions, "filePaidReport");

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
    websiteUrl?: string;
    instagramUrl?: string;
    socialUrl?: string;
    description?: string;
    successUrl: string;
    cancelUrl: string;
  },
  { checkoutUrl: string | null; orderId: string }
>(functions, "createSponsorshipCheckout");

export const setUserRole = httpsCallable<
  { targetUid: string; roles: string[]; primaryRole: string },
  { ok: true }
>(functions, "setUserRole");

export const setActiveRole = httpsCallable<{ role: string }, { ok: true }>(functions, "setActiveRole");

export const reviewVolunteerApplication = httpsCallable<
  { applicationId: string; decision: "approve" | "reject" },
  { status: "approved" | "rejected" }
>(functions, "reviewVolunteerApplication");

export const reviewChallengeSubmission = httpsCallable<
  { submissionId: string; decision: "approve" | "reject" },
  { status: "approved" | "rejected"; bonusPoints?: number; rank?: number }
>(functions, "reviewChallengeSubmission");

type NotificationTarget =
  | { type: "all" }
  | { type: "role"; role: string }
  | { type: "game"; gameId: string }
  | { type: "users"; uids: string[] };

export const sendNotification = httpsCallable<
  { title: string; body: string; target: NotificationTarget },
  { notifiedCount: number; pushCount: number }
>(functions, "sendNotification");

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

export const markChannelRead = httpsCallable<
  { kind: "user" | "team" | "role" | "pod"; id: string },
  { ok: true }
>(functions, "markChannelRead");

export const sendVolunteerTaskMessage = httpsCallable<
  { taskId: string; text: string },
  { message: VolunteerTaskMessage }
>(functions, "sendVolunteerTaskMessage");

export const sendPodTaskMessage = httpsCallable<
  { taskId: string; text: string },
  { message: PodTaskMessage }
>(functions, "sendPodTaskMessage");

export const createPod = httpsCallable<
  { name: string; fields: string[]; memberUids: string[] },
  { pod: Pod }
>(functions, "createPod");

export const updatePod = httpsCallable<
  { podId: string; name?: string; fields?: string[]; memberUids?: string[] },
  { ok: true }
>(functions, "updatePod");

export const deletePod = httpsCallable<{ podId: string }, { ok: true }>(functions, "deletePod");

export const ensurePodsSeeded = httpsCallable<Record<string, never>, { ok: true }>(functions, "ensurePodsSeeded");

export const sendPodMessage = httpsCallable<
  { podId: string; text: string },
  { message: PodChannelMessage }
>(functions, "sendPodMessage");

export const getPodMemberNames = httpsCallable<
  { podId: string },
  { members: { uid: string; displayName: string }[] }
>(functions, "getPodMemberNames");

export const getRecruitableVolunteers = httpsCallable<
  { podId: string },
  { candidates: { uid: string; displayName: string }[] }
>(functions, "getRecruitableVolunteers");

export const addPodVolunteer = httpsCallable<{ podId: string; uidToAdd: string }, { ok: true }>(
  functions,
  "addPodVolunteer"
);

export const listOpenPods = httpsCallable<
  Record<string, never>,
  { pods: { id: string; name: string; memberCount: number }[] }
>(functions, "listOpenPods");

export const joinPod = httpsCallable<{ podId: string }, { ok: true }>(functions, "joinPod");

export const lookupUserByEmail = httpsCallable<
  { email: string },
  { user: { uid: string; email: string; displayName: string } | null }
>(functions, "lookupUserByEmail");
