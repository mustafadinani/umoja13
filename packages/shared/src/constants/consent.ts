/**
 * Bump this whenever the consent copy below changes materially, so a
 * CheckIn.consent.policyVersion on file tells us which version of the
 * disclosure someone actually agreed to.
 */
export const CHECKIN_CONSENT_POLICY_VERSION = "2026-07-26";

export const CHECKIN_CONSENT_COPY =
  "To check in, we take a selfie and a photo of a government-issued ID, and compare " +
  "them against your registration photo and read your date of birth using AI (Anthropic " +
  "Claude) to confirm tournament eligibility. These images are only used for this " +
  "verification and are visible to admins/the commissioner, kept only as long as the " +
  "tournament needs them.";

export const CHECKIN_AI_BYPASS_LABEL = "Skip AI — have a staff member review my photos and ID manually instead";

export const CHECKIN_AI_BYPASS_CAVEAT = "This can take longer to get approved than AI verification.";
