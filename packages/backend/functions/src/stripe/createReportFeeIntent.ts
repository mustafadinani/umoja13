import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type ComplaintType } from "@umoja/shared";
import { db } from "../util/admin.js";
import { nextCaseNumber } from "../util/counters.js";
import { isCaptainOrCoachManager } from "../util/teamRoles.js";
import {
  getStripeLive,
  stripeSecretKeyLive,
  COMPLAINT_FEE_CENTS,
  STRIPE_PUBLISHABLE_KEY_LIVE,
} from "./stripeClient.js";

/**
 * Creates a $35 PaymentIntent (Stripe **live**) for the in-app report / complaint fee.
 * Client confirms the Payment Element, then calls filePaidReport.
 * Used by web ReportIssuePage and mobile ComplaintScreen.
 *
 * Restricted to a team's real registration captain or an admin-designated
 * coach/manager — same audience as the captain_complaint flow (fileIncident).
 * This "report to the commissioner" flow and "file a complaint" are the same
 * thing with a different entry point, so they share the same gate. Checked
 * before creating the Stripe intent at all, so nobody outside that group can
 * even start a payment for it.
 */
export const createReportFeeIntent = onCall(
  { secrets: [stripeSecretKeyLive] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
    if (!(await isCaptainOrCoachManager(uid))) {
      throw new HttpsError("permission-denied", "Only a team's captain or coach/manager can file this report.");
    }

    try {
      const stripe = getStripeLive();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: COMPLAINT_FEE_CENTS,
        currency: "usd",
        // Card only — avoids Link / bank methods that force a full-page redirect.
        payment_method_types: ["card"],
        description: "Umoja Games — commissioner report review fee",
        metadata: {
          purpose: "report_to_commissioner",
          uid,
        },
      });

      if (!paymentIntent.client_secret) {
        throw new HttpsError("internal", "Stripe did not return a client secret.");
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: STRIPE_PUBLISHABLE_KEY_LIVE,
        amountCents: COMPLAINT_FEE_CENTS,
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      const message = err instanceof Error ? err.message : "Couldn't start payment.";
      console.error("createReportFeeIntent error:", err);
      throw new HttpsError("failed-precondition", message);
    }
  }
);

interface FilePaidReportRequest {
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
}

/**
 * Verifies the live PaymentIntent succeeded, then creates the incident with fee marked paid.
 * Re-checks captain/coach-manager status (see createReportFeeIntent) — the
 * payment intent could technically survive a role change between the two
 * calls, so this is defense in depth, not the only gate.
 */
export const filePaidReport = onCall(
  { secrets: [stripeSecretKeyLive] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
    if (!(await isCaptainOrCoachManager(uid))) {
      throw new HttpsError("permission-denied", "Only a team's captain or coach/manager can file this report.");
    }

    const {
      text,
      filedByName,
      filedByRole,
      paymentIntentId,
      source = "fan_message",
      complaintType,
      gameId,
      playerKey,
      playerName,
      playerTeamId,
      playerCategoryId,
    } = request.data as FilePaidReportRequest;

    if (!text || text.trim().length < 3) {
      throw new HttpsError("invalid-argument", "Please describe what happened (at least 3 characters).");
    }
    if (!paymentIntentId) {
      throw new HttpsError("invalid-argument", "paymentIntentId is required.");
    }
    if (!complaintType) {
      throw new HttpsError("invalid-argument", "Please choose an issue type.");
    }
    // Same type-specific requirements as fileIncident (see its
    // assertComplaintTypeFields) — kept inline here since this callable
    // lives in a different file and the check is only two branches.
    if (complaintType === "ineligible_player" && (!playerKey || !playerName)) {
      throw new HttpsError("invalid-argument", "Please search for and select the player you're reporting.");
    }
    if (complaintType === "game_related" && !gameId) {
      throw new HttpsError("invalid-argument", "Please select the game you're referring to.");
    }

    const stripe = getStripeLive();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      throw new HttpsError("failed-precondition", `Payment not complete (status: ${pi.status}).`);
    }
    if (pi.amount !== COMPLAINT_FEE_CENTS) {
      throw new HttpsError("failed-precondition", "Payment amount does not match the $35 fee.");
    }
    if (pi.metadata?.uid && pi.metadata.uid !== uid) {
      throw new HttpsError("permission-denied", "Payment does not belong to this account.");
    }

    const prefix = source === "fan_message" ? "UQ" : "UG";
    const caseNumber = await nextCaseNumber(prefix);
    const now = Date.now();
    const ref = db.collection(COLLECTIONS.incidents).doc();

    await ref.set({
      id: ref.id,
      caseNumber,
      source,
      filedByUid: uid,
      filedByName,
      filedByRole,
      complaintType: complaintType ?? null,
      // Previously always null here regardless of what the filer selected —
      // a game-related report lost its game reference the moment it was
      // paid for. Now stored whenever the filer actually picked one.
      gameId: complaintType === "game_related" ? gameId : null,
      playerKey: complaintType === "ineligible_player" ? playerKey : null,
      playerName: complaintType === "ineligible_player" ? playerName : null,
      playerTeamId: complaintType === "ineligible_player" ? (playerTeamId ?? null) : null,
      playerCategoryId: complaintType === "ineligible_player" ? (playerCategoryId ?? null) : null,
      text: text.trim(),
      status: "submitted",
      thread: [],
      fee: {
        amountCents: COMPLAINT_FEE_CENTS,
        stripePaymentIntentId: pi.id,
        stripeConfirmationId: pi.id,
        paid: true,
        refunded: false,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { id: ref.id, caseNumber, stripeConfirmationId: pi.id };
  }
);
