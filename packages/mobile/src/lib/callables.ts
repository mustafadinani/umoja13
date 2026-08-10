import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  IncidentSource,
  ComplaintType,
  SponsorTier,
  SponsorshipDonorType,
  TeamChannelMessage,
  ChannelRole,
  RoleChannelMessage,
  UserChannelMessage,
  VolunteerTaskMessage,
  PodChannelMessage,
  PodTaskMessage,
  Pod,
} from "@umoja/shared";
import { app } from "./firebase";

const functions = getFunctions(app);

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

export const askUmojaChannel = httpsCallable<
  { text: string },
  { reply: string; message: UserChannelMessage }
>(functions, "askUmojaChannel");

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

export const createSponsorshipIntent = httpsCallable<
  {
    tierId: SponsorTier;
    donorType: SponsorshipDonorType;
    donorName: string;
    email: string;
    phone?: string;
    companyLogoUrl?: string;
    customNote?: string;
    customAmountCents?: number;
  },
  { clientSecret: string; paymentIntentId: string; publishableKey: string; orderId: string; amountCents: number }
>(functions, "createSponsorshipIntent");

export const confirmSponsorshipPayment = httpsCallable<
  { orderId: string; paymentIntentId: string },
  { orderId: string; status: "paid" }
>(functions, "confirmSponsorshipPayment");

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

export const sendPodMessage = httpsCallable<
  { podId: string; text: string },
  { message: PodChannelMessage }
>(functions, "sendPodMessage");

export const listOpenPods = httpsCallable<
  Record<string, never>,
  { pods: { id: string; name: string; memberCount: number }[] }
>(functions, "listOpenPods");

export const joinPod = httpsCallable<{ podId: string }, { ok: true }>(functions, "joinPod");

/** Staff-only full roster replace — also used from mobile to remove a member (staff can't self-serve-recruit-only like a volunteer pod member can). */
export const updatePod = httpsCallable<
  { podId: string; name?: string; fields?: string[]; memberUids?: string[]; visibility?: Pod["visibility"] },
  { ok: true }
>(functions, "updatePod");

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

export const lookupUserByEmail = httpsCallable<
  { email: string },
  { user: { uid: string; email: string; displayName: string } | null }
>(functions, "lookupUserByEmail");

export const setJerseyNumber = httpsCallable<
  { teamId: string; playerKey: string; categoryId: string; jerseyNumber: number | null },
  { ok: true }
>(functions, "setJerseyNumber");
