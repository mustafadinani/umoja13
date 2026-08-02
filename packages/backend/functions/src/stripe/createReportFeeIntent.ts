import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../util/admin.js";
import { nextCaseNumber } from "../util/counters.js";
import {
  getStripeTest,
  stripeSecretKeyTest,
  COMPLAINT_FEE_CENTS,
  STRIPE_PUBLISHABLE_KEY_TEST,
} from "./stripeClient.js";

/**
 * Creates a $35 PaymentIntent for the in-app report / complaint fee form.
 * Client confirms the Payment Element / PaymentSheet, then calls filePaidReport.
 */
export const createReportFeeIntent = onCall(
  { secrets: [stripeSecretKeyTest] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    try {
      const stripe = getStripeTest();
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
        publishableKey: STRIPE_PUBLISHABLE_KEY_TEST,
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
  complaintType?: string;
}

/**
 * Verifies the PaymentIntent succeeded, then creates the incident with fee marked paid
 * and stripeConfirmationId set. Success UI should only show after this returns.
 */
export const filePaidReport = onCall(
  { secrets: [stripeSecretKeyTest] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const {
      text,
      filedByName,
      filedByRole,
      paymentIntentId,
      source = "fan_message",
      complaintType,
    } = request.data as FilePaidReportRequest;

    if (!text || text.trim().length < 3) {
      throw new HttpsError("invalid-argument", "Please describe what happened (at least 3 characters).");
    }
    if (!paymentIntentId) {
      throw new HttpsError("invalid-argument", "paymentIntentId is required.");
    }

    const stripe = getStripeTest();
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
      gameId: null,
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
