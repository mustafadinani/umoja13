import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";

/** Legacy / shared secret used by sponsorship + existing webhook. */
export const stripeSecretKey: ReturnType<typeof defineSecret> = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret: ReturnType<typeof defineSecret> = defineSecret("STRIPE_WEBHOOK_SECRET");

/** Test-mode secret for complaint / report-to-commissioner fee validation. */
export const stripeSecretKeyTest: ReturnType<typeof defineSecret> = defineSecret("STRIPE_SECRET_KEY_TEST");

let client: Stripe | null = null;
let testClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(stripeSecretKey.value());
  }
  return client;
}

export function getStripeTest(): Stripe {
  if (!testClient) {
    // Defensive: secrets sometimes get pasted with quotes/newlines.
    const raw = stripeSecretKeyTest.value().trim().replace(/^["']+|["']+$/g, "");
    testClient = new Stripe(raw);
  }
  return testClient;
}

export const COMPLAINT_FEE_CENTS = 3500;

/** Publishable key paired with STRIPE_SECRET_KEY_TEST (Umoja acct_1Gmkmo… test mode). */
export const STRIPE_PUBLISHABLE_KEY_TEST = "pk_test_oUXnQJoAh67w87FY7aLkNm8A00xCvO8ra4";

