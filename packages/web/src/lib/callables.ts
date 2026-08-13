import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
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
  Pod,
  PodChannelMessage,
  PodTaskMessage,
  WebPushSubscription,
} from "@umoja/shared";
import { app } from "./firebase";

const functions = getFunctions(app, "us-central1");
// firebase.ts only wires up auth/firestore/storage emulators — functions needs
// its own connect call, and was previously missing one, so callables silently
// hit production even with VITE_USE_FIREBASE_EMULATORS=true set.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export const adminReviewCheckIn = httpsCallable<
  { checkInId: string; decision: "approve" | "reject" | "nullify" | "restore"; reason?: string },
  { status: string }
>(functions, "adminReviewCheckIn");

export const submitGameCard = httpsCallable<
  { gameId: string; photoUrl: string },
  { status: "awaiting_commissioner" }
>(functions, "submitGameCard");

export const reopenGameCard = httpsCallable<
  { gameId: string },
  { status: "not_submitted" }
>(functions, "reopenGameCard");

export const fileIncident = httpsCallable<
  {
    source: IncidentSource;
    filedByName: string;
    filedByRole: string;
    complaintType?: ComplaintType;
    gameId?: string;
    playerKey?: string;
    playerName?: string;
    playerTeamId?: string;
    playerCategoryId?: string;
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
    complaintType?: ComplaintType;
    gameId?: string;
    playerKey?: string;
    playerName?: string;
    playerTeamId?: string;
    playerCategoryId?: string;
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
    websiteUrl?: string;
    instagramUrl?: string;
    socialUrl?: string;
    description?: string;
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
  { notifiedCount: number; pushCount: number; webPushCount: number; emailCount: number }
>(functions, "sendNotification");

export const sendBulkEmail = httpsCallable<
  { recipients: { email: string; name?: string }[]; subject: string; body: string; mode: "individual" | "bcc"; bccTo?: string },
  { sent: number; failed: string[] }
>(functions, "sendBulkEmail");

export const postAnnouncement = httpsCallable<
  { title: string; body: string; alsoNotify?: boolean },
  { id: string; notifiedCount: number; pushCount: number; webPushCount: number }
>(functions, "postAnnouncement");

export const registerWebPushSubscription = httpsCallable<
  { subscription: WebPushSubscription | null },
  { ok: true }
>(functions, "registerWebPushSubscription");

export const updateAnnouncement = httpsCallable<
  { id: string; title: string; body: string },
  { id: string }
>(functions, "updateAnnouncement");

export const deleteAnnouncement = httpsCallable<{ id: string }, { id: string }>(
  functions,
  "deleteAnnouncement"
);

export const sendTeamMessage = httpsCallable<
  { teamId: string; text?: string; mediaUrl?: string; mediaType?: "photo" | "video" },
  { message: TeamChannelMessage }
>(functions, "sendTeamMessage");

export const sendRoleMessage = httpsCallable<
  { role: ChannelRole; text?: string; mediaUrl?: string; mediaType?: "photo" | "video" },
  { message: RoleChannelMessage }
>(functions, "sendRoleMessage");

export const sendUserMessage = httpsCallable<
  { targetUid?: string; text?: string; mediaUrl?: string; mediaType?: "photo" | "video" },
  { message: UserChannelMessage }
>(functions, "sendUserMessage");

export const markChannelRead = httpsCallable<
  { kind: "user" | "team" | "role" | "pod"; id: string },
  { ok: true }
>(functions, "markChannelRead");

export const setHuntStarted = httpsCallable<{ started: boolean }, { started: boolean }>(
  functions,
  "setHuntStarted"
);

export const setJerseyNumber = httpsCallable<
  { teamId: string; playerKey: string; categoryId: string; jerseyNumber: number | null },
  { ok: true }
>(functions, "setJerseyNumber");

export const setSwagPickedUp = httpsCallable<
  { teamId: string; playerKey: string; categoryId: string; pickedUp: boolean },
  { ok: true }
>(functions, "setSwagPickedUp");

export const assignTeamOfficial = httpsCallable<
  | { teamId: string; kind: "captain"; categoryId: string; playerKey: string; targetUid: string }
  | { teamId: string; kind: "manager_coach"; email: string },
  { ok: true; uid?: string }
>(functions, "assignTeamOfficial");

export const removeTeamOfficial = httpsCallable<
  | { teamId: string; kind: "captain"; categoryId: string; playerKey: string }
  | { teamId: string; kind: "manager_coach"; uid: string },
  { ok: true }
>(functions, "removeTeamOfficial");

export const getTeamOfficialNames = httpsCallable<
  { teamId: string },
  { members: { uid: string; displayName: string }[] }
>(functions, "getTeamOfficialNames");

export const backfillTeamRosterAccess = httpsCallable<void, { teamsFixed: number }>(
  functions,
  "backfillTeamRosterAccess"
);

export const syncMyRoleClaims = httpsCallable<void, { roles: string[] }>(functions, "syncMyRoleClaims");

export const sendVolunteerTaskMessage = httpsCallable<
  { taskId: string; text: string },
  { message: VolunteerTaskMessage }
>(functions, "sendVolunteerTaskMessage");

export const sendPodTaskMessage = httpsCallable<
  { taskId: string; text: string },
  { message: PodTaskMessage }
>(functions, "sendPodTaskMessage");

export const createPod = httpsCallable<
  { name: string; fields: string[]; memberUids: string[]; visibility?: Pod["visibility"] },
  { pod: Pod }
>(functions, "createPod");

export const updatePod = httpsCallable<
  { podId: string; name?: string; fields?: string[]; memberUids?: string[]; visibility?: Pod["visibility"] },
  { ok: true }
>(functions, "updatePod");

export const deletePod = httpsCallable<{ podId: string }, { ok: true }>(functions, "deletePod");

export const ensurePodsSeeded = httpsCallable<Record<string, never>, { ok: true }>(functions, "ensurePodsSeeded");

export const sendPodMessage = httpsCallable<
  { podId: string; text?: string; mediaUrl?: string; mediaType?: "photo" | "video" },
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

export const setCheckInPhotoOverride = httpsCallable<
  { checkInId: string; override: "selfie" | "registration" | null },
  { ok: true }
>(functions, "setCheckInPhotoOverride");

export const lookupUserByEmail = httpsCallable<
  { email: string },
  { user: { uid: string; email: string; displayName: string } | null }
>(functions, "lookupUserByEmail");
