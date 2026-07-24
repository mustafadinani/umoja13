import { onRequest } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../util/admin.js";
import { getStripe, stripeSecretKey, stripeWebhookSecret } from "./stripeClient.js";
import type Stripe from "stripe";

export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).send("Missing signature");
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    } catch (err) {
      res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const incidentId = session.metadata?.incidentId;
      if (incidentId) {
        await db.collection(COLLECTIONS.incidents).doc(incidentId).set(
          { "fee.paid": true, status: "submitted", updatedAt: Date.now() },
          { merge: true }
        );
      }

      const sponsorshipOrderId = session.metadata?.sponsorshipOrderId;
      if (sponsorshipOrderId) {
        await db.collection(COLLECTIONS.sponsorshipOrders).doc(sponsorshipOrderId).set(
          { status: "paid", paidAt: Date.now() },
          { merge: true }
        );
      }
    }

    res.status(200).send({ received: true });
  }
);
