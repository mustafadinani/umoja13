import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";

/** Used by sponsorship Checkout + stripeWebhook. */
export const stripeSecretKey: ReturnType<typeof defineSecret> = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret: ReturnType<typeof defineSecret> = defineSecret("STRIPE_WEBHOOK_SECRET");

/** Test-mode secret (still available for stripePayment mode=test). */
export const stripeSecretKeyTest: ReturnType<typeof defineSecret> = defineSecret("STRIPE_SECRET_KEY_TEST");

/**
 * Live-mode secret for report / complaint fee PaymentIntents + Checkout.
 * Same secret name as `stripePayment` live mode.
 */
export const stripeSecretKeyLive: ReturnType<typeof defineSecret> = defineSecret("STRIPE_SECRET_KEY_LIVE");

let client: Stripe | null = null;
let testClient: Stripe | null = null;
let liveClient: Stripe | null = null;

function cleanSecret(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, "");
}

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(cleanSecret(stripeSecretKey.value()));
  }
  return client;
}

export function getStripeTest(): Stripe {
  if (!testClient) {
    testClient = new Stripe(cleanSecret(stripeSecretKeyTest.value()));
  }
  return testClient;
}

export function getStripeLive(): Stripe {
  if (!liveClient) {
    liveClient = new Stripe(cleanSecret(stripeSecretKeyLive.value()));
  }
  return liveClient;
}

export const COMPLAINT_FEE_CENTS = 3500;

/** Publishable keys are safe to return to clients (not secrets). */
export const STRIPE_PUBLISHABLE_KEY_TEST = "pk_test_oUXnQJoAh67w87FY7aLkNm8A00xCvO8ra4";
/** Paired with STRIPE_SECRET_KEY_LIVE (same value as stripePayment live publishableKey). */
export const STRIPE_PUBLISHABLE_KEY_LIVE = "pk_live_JBXpVErqOal4hOovV9km8CiV008EfzhYUJ";
