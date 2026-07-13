import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, type Incident } from "@umoja/shared";
import { db } from "../util/admin.js";
import { getStripe, stripeSecretKey, COMPLAINT_FEE_CENTS } from "./stripeClient.js";

interface CreateComplaintCheckoutRequest {
  incidentId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe test-mode Checkout session for the $35 captain complaint
 * review fee. The webhook (see stripeWebhook.ts) marks the incident's fee as
 * paid once the session completes.
 */
export const createComplaintCheckout = onCall<CreateComplaintCheckoutRequest>(
  { secrets: [stripeSecretKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const { incidentId, successUrl, cancelUrl } = request.data;
    const ref = db.collection(COLLECTIONS.incidents).doc(incidentId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Incident not found.");
    const incident = snap.data() as Incident;
    if (incident.filedByUid !== uid) throw new HttpsError("permission-denied", "Not your complaint.");
    if (incident.source !== "captain_complaint") {
      throw new HttpsError("failed-precondition", "Only captain complaints carry a review fee.");
    }
    if (incident.fee?.paid) {
      throw new HttpsError("failed-precondition", "Fee already paid.");
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Complaint review fee — Case ${incident.caseNumber}` },
            unit_amount: COMPLAINT_FEE_CENTS,
          },
          quantity: 1,
        },
      ],
      metadata: { incidentId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await ref.set(
      { fee: { amountCents: COMPLAINT_FEE_CENTS, stripeCheckoutSessionId: session.id, paid: false, refunded: false } },
      { merge: true }
    );

    return { checkoutUrl: session.url };
  }
);
