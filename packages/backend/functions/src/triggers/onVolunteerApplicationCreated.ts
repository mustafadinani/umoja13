import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { COLLECTIONS, type VolunteerApplication } from "@umoja/shared";
import { FIRESTORE_DATABASE_ID } from "../util/admin.js";
import { sendEmail, EMAIL_SECRETS } from "../services/emailjs.service.js";
import { volunteerApplicationReceivedEmail } from "../util/emailTemplates.js";

/**
 * BecomeVolunteerModal writes volunteerApplications directly from the
 * client (no callable in the loop), so the "we got it" confirmation has to
 * be a Firestore trigger rather than living next to the write itself.
 */
export const onVolunteerApplicationCreated = onDocumentCreated(
  { document: `${COLLECTIONS.volunteerApplications}/{applicationId}`, database: FIRESTORE_DATABASE_ID, secrets: EMAIL_SECRETS },
  async (event) => {
    const application = event.data?.data() as VolunteerApplication | undefined;
    if (!application?.email) return;

    const { subject, html } = volunteerApplicationReceivedEmail(application.name);
    try {
      await sendEmail(application.email, subject, html);
    } catch (err) {
      console.error("onVolunteerApplicationCreated: failed to send confirmation email:", err);
    }
  }
);
