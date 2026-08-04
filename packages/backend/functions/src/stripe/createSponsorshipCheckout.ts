import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, SPONSORSHIP_TIERS, type SponsorTier, type SponsorshipDonorType } from "@umoja/shared";
import { db } from "../util/admin.js";
import { getStripe, stripeSecretKey } from "./stripeClient.js";

interface CreateSponsorshipCheckoutRequest {
  tierId: SponsorTier;
  donorType: SponsorshipDonorType;
  donorName: string;
  email: string;
  phone?: string;
  companyLogoUrl?: string;
  customNote?: string;
  customAmountCents?: number;
  websiteUrl?: string;
  instagramUrl?: string;
  socialUrl?: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe Checkout session for a sponsorship purchase. Writes a
 * pending sponsorshipOrders doc up front, then the webhook (see
 * stripeWebhook.ts) marks it "paid" once the session completes. An admin
 * later converts a paid order into a public Sponsor entry.
 */
export const createSponsorshipCheckout = onCall<CreateSponsorshipCheckoutRequest>(
  { secrets: [stripeSecretKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const {
      tierId,
      donorType,
      donorName,
      email,
      phone,
      companyLogoUrl,
      customNote,
      customAmountCents,
      websiteUrl,
      instagramUrl,
      socialUrl,
      description,
      successUrl,
      cancelUrl,
    } = request.data;

    const tier = SPONSORSHIP_TIERS.find((t) => t.id === tierId);
    if (!tier) throw new HttpsError("invalid-argument", "Unknown sponsorship tier.");
    if (!donorName?.trim() || !email?.trim()) {
      throw new HttpsError("invalid-argument", "Name and email are required.");
    }

    let amountCents: number;
    if (tier.priceCents != null) {
      amountCents = tier.priceCents;
    } else {
      if (!customAmountCents || customAmountCents < 100) {
        throw new HttpsError("invalid-argument", "Enter a custom amount of at least $1.");
      }
      amountCents = Math.round(customAmountCents);
    }

    const orderRef = db.collection(COLLECTIONS.sponsorshipOrders).doc();
    await orderRef.set({
      tierId,
      amountCents,
      donorType,
      donorName: donorName.trim(),
      email: email.trim(),
      ...(phone?.trim() ? { phone: phone.trim() } : {}),
      ...(companyLogoUrl ? { companyLogoUrl } : {}),
      ...(customNote?.trim() ? { customNote: customNote.trim() } : {}),
      ...(websiteUrl?.trim() ? { websiteUrl: websiteUrl.trim() } : {}),
      ...(instagramUrl?.trim() ? { instagramUrl: instagramUrl.trim() } : {}),
      ...(socialUrl?.trim() ? { socialUrl: socialUrl.trim() } : {}),
      ...(description?.trim() ? { description: description.trim() } : {}),
      status: "pending",
      filedByUid: uid,
      createdAt: Date.now(),
    });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Umoja Games sponsorship — ${tier.label}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { sponsorshipOrderId: orderRef.id },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await orderRef.set({ stripeCheckoutSessionId: session.id }, { merge: true });

    return { checkoutUrl: session.url, orderId: orderRef.id };
  }
);
