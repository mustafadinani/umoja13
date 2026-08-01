import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type Incident } from "@umoja/shared";
import { db } from "../util/admin.js";
import { getStripeTest, stripeSecretKeyTest } from "./stripeClient.js";

interface ConfirmIncidentPaymentRequest {
  incidentId: string;
  sessionId: string;
}

/**
 * Confirms a completed Stripe Checkout session (test mode) and writes
 * fee.paid + stripeConfirmationId onto the incident. Safe to call from the
 * success redirect when the webhook is slow or not yet configured.
 */
export const confirmIncidentPayment = onCall<ConfirmIncidentPaymentRequest>(
  { secrets: [stripeSecretKeyTest] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const { incidentId, sessionId } = request.data;
    if (!incidentId || !sessionId) {
      throw new HttpsError("invalid-argument", "incidentId and sessionId are required.");
    }

    const ref = db.collection(COLLECTIONS.incidents).doc(incidentId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Incident not found.");
    const incident = snap.data() as Incident;
    if (incident.filedByUid !== uid) throw new HttpsError("permission-denied", "Not your report.");

    if (incident.fee?.paid && incident.fee.stripeConfirmationId) {
      return {
        paid: true,
        stripeConfirmationId: incident.fee.stripeConfirmationId,
        alreadyRecorded: true,
      };
    }

    const session = await getStripeTest().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.incidentId && session.metadata.incidentId !== incidentId) {
      throw new HttpsError("failed-precondition", "Session does not match this incident.");
    }
    if (session.payment_status !== "paid") {
      throw new HttpsError("failed-precondition", `Payment not complete (status: ${session.payment_status}).`);
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? undefined;
    const confirmationId = paymentIntentId ?? session.id;

    await ref.set(
      {
        fee: {
          amountCents: incident.fee?.amountCents ?? 3500,
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: paymentIntentId ?? null,
          stripeConfirmationId: confirmationId,
          paid: true,
          refunded: false,
        },
        status: "submitted",
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return { paid: true, stripeConfirmationId: confirmationId, alreadyRecorded: false };
  }
);
