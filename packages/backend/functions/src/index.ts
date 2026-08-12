export { setUserRole } from "./http/setUserRole.js";
export { setActiveRole } from "./http/setActiveRole.js";
export { reviewVolunteerApplication } from "./http/reviewVolunteerApplication.js";
export { reviewChallengeSubmission } from "./http/reviewChallengeSubmission.js";
export { adminReviewCheckIn } from "./http/adminReviewCheckIn.js";
export { setCheckInPhotoOverride } from "./http/setCheckInPhotoOverride.js";
export { submitGameCard, reopenGameCard } from "./http/submitGameCard.js";
export { fileIncident } from "./http/fileIncident.js";
export { callItFinal } from "./http/callItFinal.js";
export { askUmojaChannel } from "./ai/chatAssistant.js";
export { createReportFeeIntent, filePaidReport } from "./stripe/createReportFeeIntent.js";
export { createSponsorshipIntent, confirmSponsorshipPayment } from "./stripe/createSponsorshipIntent.js";
export { stripeWebhook } from "./stripe/stripeWebhook.js";
export { stripePayment } from "./http/stripePayment.js";
export { onGameWrite } from "./triggers/onGameWrite.js";
// onTeamWrite was deliberately removed (see fdc2a48) — it kept
// teams/{teamId}.roster in sync with this app's own dead pre-Outreach-import
// teams collection, which nothing else reads or writes anymore and which
// caused a real privacy bug (stale/wrong team-channel access). It's replaced
// by onPlayerRegisteredWrite below, which derives roster access from the
// real Outreach registration data. Do not reintroduce onTeamWrite.
export { onPlayerRegisteredWrite } from "./triggers/onPlayerRegisteredWrite.js";
export { onCheckInWrite } from "./triggers/onCheckInWrite.js";
export { onVolunteerApplicationCreated } from "./triggers/onVolunteerApplicationCreated.js";
export { registerPushToken } from "./http/registerPushToken.js";
export { registerWebPushSubscription } from "./http/registerWebPushSubscription.js";
export { sendNotification } from "./http/sendNotification.js";
export { postAnnouncement, updateAnnouncement, deleteAnnouncement } from "./http/postAnnouncement.js";
export { sendTeamMessage } from "./http/sendTeamMessage.js";
export { sendRoleMessage } from "./http/sendRoleMessage.js";
export { sendUserMessage } from "./http/sendUserMessage.js";
export { sendVolunteerTaskMessage } from "./http/sendVolunteerTaskMessage.js";
export { sendPodTaskMessage } from "./http/sendPodTaskMessage.js";
export {
  createPod,
  updatePod,
  deletePod,
  ensurePodsSeeded,
  getPodMemberNames,
  getRecruitableVolunteers,
  addPodVolunteer,
  listOpenPods,
  joinPod,
} from "./http/podAdmin.js";
export { sendPodMessage } from "./http/sendPodMessage.js";
export { lookupUserByEmail } from "./http/lookupUserByEmail.js";
export { markChannelRead } from "./http/markChannelRead.js";
export { setJerseyNumber } from "./http/setJerseyNumber.js";
export { assignTeamOfficial, removeTeamOfficial, getTeamOfficialNames } from "./http/assignTeamOfficial.js";
export { setHuntStarted } from "./http/huntConfig.js";
export { backfillTeamRosterAccess } from "./http/backfillTeamRosterAccess.js";
export { syncMyRoleClaims } from "./http/syncMyRoleClaims.js";
