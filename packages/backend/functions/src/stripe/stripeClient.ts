import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";

export const stripeSecretKey: ReturnType<typeof defineSecret> = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret: ReturnType<typeof defineSecret> = defineSecret("STRIPE_WEBHOOK_SECRET");

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(stripeSecretKey.value());
  }
  return client;
}

export const COMPLAINT_FEE_CENTS = 3500;
