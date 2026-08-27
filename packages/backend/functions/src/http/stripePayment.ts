import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

type StripeMode = "test" | "live";

// Flip DEFAULT_STRIPE_MODE, or pass { mode: "test"|"live" } in the request body.
const DEFAULT_STRIPE_MODE: StripeMode = "live";

const stripeSecretKeyTest = defineSecret("STRIPE_SECRET_KEY_TEST");
const stripeSecretKeyLive = defineSecret("STRIPE_SECRET_KEY_LIVE");

/** Publishable keys are safe to ship to clients (not secrets). Same values as stripeClient.ts. */
const STRIPE_PUBLISHABLE = {
  test: "pk_test_oUXnQJoAh67w87FY7aLkNm8A00xCvO8ra4",
  live: "pk_live_JBXpVErqOal4hOovV9km8CiV008EfzhYUJ",
} as const;

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/umoja-games-proto\.web\.app$/,
  /^https:\/\/umoja-flutter-web.*\.web\.app$/,
  /^https:\/\/.*\.web\.app$/,
  /^https:\/\/.*\.firebaseapp\.com$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

interface StripePaymentBody {
  email?: string;
  amount?: string | number;
  currency?: string;
  /** Override DEFAULT_STRIPE_MODE for this request. */
  mode?: StripeMode;
}

function applyCors(req: { headers: { origin?: string }; method?: string }, res: {
  set: (k: string, v: string) => void;
  status: (code: number) => { send: (body?: string) => void };
}): "preflight" | "ok" {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin))) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return "preflight";
  }
  return "ok";
}

function parseBody(raw: unknown): StripePaymentBody {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as StripePaymentBody;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") return raw as StripePaymentBody;
  return {};
}

function resolveMode(raw: unknown): StripeMode | null {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_STRIPE_MODE;
  if (raw === "test" || raw === "live") return raw;
  return null;
}

/**
 * HTTP endpoint for Stripe PaymentSheet setup (USD only).
 * POST JSON: { email, amount (major units), currency?, mode?: "test"|"live" }
 * Returns: { success, paymentIntent, ephemeralKey, customer, publishableKey, mode }
 */
export const stripePayment = onRequest(
  { cors: false, secrets: [stripeSecretKeyTest, stripeSecretKeyLive] },
  async (req, res) => {
    if (applyCors(req, res) === "preflight") return;

    if (req.method !== "POST") {
      res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
      return;
    }

    const body = parseBody(req.body);
    const email = body.email?.trim();
    const currency = (body.currency ?? "usd").trim().toLowerCase();
    const amountMajor = typeof body.amount === "string" ? Number.parseInt(body.amount, 10) : Number(body.amount);
    const mode = resolveMode(body.mode);

    if (!email || !email.includes("@")) {
      res.status(400).json({ success: false, error: "Valid email is required." });
      return;
    }
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
      res.status(400).json({ success: false, error: "amount must be a positive number (major currency units)." });
      return;
    }
    if (currency !== "usd") {
      res.status(400).json({ success: false, error: "Only USD is supported." });
      return;
    }
    if (!mode) {
      res.status(400).json({ success: false, error: 'mode must be "test" or "live".' });
      return;
    }

    const secret = mode === "test" ? stripeSecretKeyTest.value() : stripeSecretKeyLive.value();

    try {
      const stripe = new Stripe(secret);

      const existing = await stripe.customers.list({ email, limit: 1 });
      const customerId =
        existing.data[0]?.id ??
        (await stripe.customers.create({ email })).id;

      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: "2022-11-15" }
      );

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountMajor * 100),
        currency: "usd",
        customer: customerId,
        automatic_payment_methods: { enabled: true },
      });

      res.status(200).json({
        success: true,
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: STRIPE_PUBLISHABLE[mode],
        mode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment setup failed.";
      console.error("stripePayment error:", err);
      res.status(500).json({ success: false, error: message });
    }
  }
);
