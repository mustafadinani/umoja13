import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  COLLECTIONS,
  CATEGORY_DOB_CUTOFF,
  OVER_AGE_CATEGORY_IDS,
  type CheckIn,
} from "@umoja/shared";
import { db, bucket } from "../util/admin.js";
import { getClaude, CLAUDE_MODEL, anthropicApiKey } from "./claudeClient.js";
import { nextPassId } from "../util/counters.js";
import { syncRosterCheckInStatus } from "../util/roster.js";

interface VerifyCheckInRequest {
  checkInId: string;
}

const MAX_AUTO_ATTEMPTS = 2; // 1st + 1 resubmit; 3rd+ attempt escalates to a human

function storagePathFromDownloadUrl(downloadUrl: string): string {
  const marker = "/o/";
  const idx = new URL(downloadUrl).pathname.indexOf(marker);
  if (idx === -1) throw new Error(`Unrecognized storage download URL: ${downloadUrl}`);
  return decodeURIComponent(new URL(downloadUrl).pathname.slice(idx + marker.length));
}

async function downloadAsBase64(downloadUrl: string): Promise<{ data: string; mediaType: string }> {
  const file = bucket.file(storagePathFromDownloadUrl(downloadUrl));
  const [buf] = await file.download();
  const [meta] = await file.getMetadata();
  const mediaType = meta.contentType || "image/jpeg";
  return { data: buf.toString("base64"), mediaType };
}

function isAgeEligible(dob: string | null, categoryId: string): boolean {
  if (!dob) return false;
  const cutoff = CATEGORY_DOB_CUTOFF[categoryId];
  if (!cutoff) return true; // Open category, no age restriction
  const dobDate = new Date(dob).getTime();
  const cutoffDate = new Date(cutoff).getTime();
  if (OVER_AGE_CATEGORY_IDS.includes(categoryId)) {
    return dobDate <= cutoffDate; // must be born ON OR BEFORE cutoff (older than X)
  }
  return dobDate >= cutoffDate; // must be born ON OR AFTER cutoff (younger than X)
}

/**
 * Compares the check-in selfie against the player's registration photo and
 * reads/validates the DOB on the government ID, using Claude's vision
 * capability. This is the real AI verification requested for check-in —
 * distinct from the referee's game-card OCR, which is intentionally stubbed.
 */
export const verifyCheckIn = onCall<VerifyCheckInRequest>(
  { secrets: [anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const { checkInId } = request.data;
    const ref = db.collection(COLLECTIONS.checkIns).doc(checkInId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Check-in not found.");
    const checkIn = snap.data() as CheckIn;
    if (checkIn.userId !== uid) throw new HttpsError("permission-denied", "Not your check-in.");

    const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
    const membership = (userSnap.data()?.playerOf ?? []).find(
      (m: { teamId: string; categoryId: string }) => m.teamId === checkIn.teamId && m.categoryId === checkIn.categoryId
    );
    const registrationPhotoUrl: string | undefined = membership?.registrationPhotoUrl;
    if (!registrationPhotoUrl) {
      throw new HttpsError("failed-precondition", "No registration photo on file to compare against.");
    }

    const [selfie, govId, registration] = await Promise.all([
      downloadAsBase64(checkIn.selfieUrl),
      downloadAsBase64(checkIn.govIdUrl),
      downloadAsBase64(registrationPhotoUrl),
    ]);

    const claude = getClaude();
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      tools: [
        {
          name: "report_verification",
          description: "Report the identity and age-eligibility verification result.",
          input_schema: {
            type: "object",
            properties: {
              face_match: { type: "boolean", description: "True if the selfie and registration photo appear to be the same person." },
              face_match_confidence: { type: "number", description: "0 to 1 confidence in the face_match determination." },
              dob_extracted: { type: ["string", "null"], description: "Date of birth read from the government ID, formatted YYYY-MM-DD, or null if unreadable." },
              reasoning: { type: "string", description: "Brief explanation of the determination." },
            },
            required: ["face_match", "face_match_confidence", "dob_extracted", "reasoning"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_verification" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are verifying a youth/adult sports tournament check-in. Compare image 1 (check-in selfie) " +
                "against image 2 (registration photo on file) — are they the same person? Then read the date of " +
                "birth printed on image 3 (a government-issued ID). Call report_verification with your findings.",
            },
            { type: "image", source: { type: "base64", media_type: selfie.mediaType as "image/jpeg", data: selfie.data } },
            { type: "image", source: { type: "base64", media_type: registration.mediaType as "image/jpeg", data: registration.data } },
            { type: "image", source: { type: "base64", media_type: govId.mediaType as "image/jpeg", data: govId.data } },
          ],
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new HttpsError("internal", "AI verification did not return a structured result.");
    }
    const result = toolUse.input as {
      face_match: boolean;
      face_match_confidence: number;
      dob_extracted: string | null;
      reasoning: string;
    };

    const ageEligible = isAgeEligible(result.dob_extracted, checkIn.categoryId);
    const passed = result.face_match && ageEligible;
    const attempt = checkIn.attempt ?? 1;

    const aiVerification = {
      faceMatch: result.face_match,
      faceMatchConfidence: result.face_match_confidence,
      dobExtracted: result.dob_extracted,
      ageEligible,
      reasoning: result.reasoning,
      checkedAt: Date.now(),
    };

    if (passed) {
      const passId = await nextPassId();
      await ref.set(
        { status: "approved", aiVerification, updatedAt: Date.now() },
        { merge: true }
      );
      await db.collection(COLLECTIONS.tournamentPasses).doc(checkIn.id).set({
        checkInId: checkIn.id,
        userId: checkIn.userId,
        teamId: checkIn.teamId,
        categoryId: checkIn.categoryId,
        status: "approved",
        passId,
        qrPayload: `UMOJA:${passId}:${checkIn.userId}:${checkIn.categoryId}`,
        selfieUrl: checkIn.selfieUrl,
      });
      await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, "approved", checkIn.selfieUrl);
      return { status: "approved" };
    }

    if (attempt >= MAX_AUTO_ATTEMPTS) {
      await ref.set(
        { status: "admin_review", aiVerification, updatedAt: Date.now() },
        { merge: true }
      );
      await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, "admin_review");
      return { status: "admin_review" };
    }

    await ref.set(
      { status: "rejected", aiVerification, updatedAt: Date.now() },
      { merge: true }
    );
    await syncRosterCheckInStatus(checkIn.teamId, checkIn.userId, "rejected");
    return { status: "rejected", reason: result.reasoning };
  }
);
