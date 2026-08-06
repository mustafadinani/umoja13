import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type Incident } from "@umoja/shared";
import { db } from "../util/admin.js";
import { getStripeLive, stripeSecretKeyLive, COMPLAINT_FEE_CENTS } from "./stripeClient.js";

interface CreateComplaintCheckoutRequest {
  incidentId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe **live** Checkout session for the $35 review fee
 * (captain complaints). confirmIncidentPayment / stripeWebhook mark paid.
 */
export const createComplaintCheckout = onCall<CreateComplaintCheckoutRequest>(
  { secrets: [stripeSecretKeyLive] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const { incidentId, successUrl, cancelUrl } = request.data;
    const ref = db.collection(COLLECTIONS.incidents).doc(incidentId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Incident not found.");
    const incident = snap.data() as Incident;
    if (incident.filedByUid !== uid) throw new HttpsError("permission-denied", "Not your complaint.");
    if (incident.source !== "captain_complaint" && incident.source !== "fan_message") {
      throw new HttpsError("failed-precondition", "This report type does not carry a review fee.");
    }
    if (incident.fee?.paid) {
      throw new HttpsError("failed-precondition", "Fee already paid.");
    }

    const productName =
      incident.source === "fan_message"
        ? `Report to commissioner — Case ${incident.caseNumber}`
        : `Complaint review fee — Case ${incident.caseNumber}`;

    try {
      const stripe = getStripeLive();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: productName },
              unit_amount: COMPLAINT_FEE_CENTS,
            },
            quantity: 1,
          },
        ],
        metadata: { incidentId, source: incident.source },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      await ref.set(
        {
          fee: {
            amountCents: COMPLAINT_FEE_CENTS,
            stripeCheckoutSessionId: session.id,
            paid: false,
            refunded: false,
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      if (!session.url) {
        throw new HttpsError("internal", "Stripe Checkout did not return a URL.");
      }

      return { checkoutUrl: session.url, sessionId: session.id };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      const message = err instanceof Error ? err.message : "Couldn't start Stripe Checkout.";
      console.error("createComplaintCheckout Stripe error:", err);
      throw new HttpsError("failed-precondition", message);
    }
  }
);
