import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, SPONSORSHIP_TIERS, type SponsorTier, type SponsorshipDonorType } from "@umoja/shared";
import { db } from "../util/admin.js";
import { getStripeLive, stripeSecretKeyLive, STRIPE_PUBLISHABLE_KEY_LIVE } from "./stripeClient.js";

interface CreateSponsorshipIntentRequest {
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
}

/**
 * Creates a Stripe **live** PaymentIntent for a sponsorship purchase, plus
 * the pending sponsorshipOrders doc up front — same embedded Payment
 * Element pattern as the report/complaint fee (createReportFeeIntent),
 * replacing the old Checkout Session redirect that bounced the donor to an
 * external browser tab. Deliberately does NOT require sign-in — a donor is
 * a guest transaction, not an app account holder, same as before.
 */
export const createSponsorshipIntent = onCall<CreateSponsorshipIntentRequest>(
  { secrets: [stripeSecretKeyLive] },
  async (request) => {
    const uid = request.auth?.uid;
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
      ...(uid ? { filedByUid: uid } : {}),
      createdAt: Date.now(),
    });

    try {
      const stripe = getStripeLive();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        // Card only — avoids Link / bank methods that force a full-page redirect.
        payment_method_types: ["card"],
        description: `Umoja Games sponsorship — ${tier.label}`,
        metadata: {
          purpose: "sponsorship",
          sponsorshipOrderId: orderRef.id,
        },
      });

      if (!paymentIntent.client_secret) {
        throw new HttpsError("internal", "Stripe did not return a client secret.");
      }

      await orderRef.set({ stripePaymentIntentId: paymentIntent.id }, { merge: true });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: STRIPE_PUBLISHABLE_KEY_LIVE,
        orderId: orderRef.id,
        amountCents,
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      const message = err instanceof Error ? err.message : "Couldn't start payment.";
      console.error("createSponsorshipIntent error:", err);
      throw new HttpsError("failed-precondition", message);
    }
  }
);

interface ConfirmSponsorshipPaymentRequest {
  orderId: string;
  paymentIntentId: string;
}

/** Verifies the live PaymentIntent actually succeeded, then marks the sponsorship order paid. */
export const confirmSponsorshipPayment = onCall<ConfirmSponsorshipPaymentRequest>(
  { secrets: [stripeSecretKeyLive] },
  async (request) => {
    const { orderId, paymentIntentId } = request.data;
    if (!orderId || !paymentIntentId) {
      throw new HttpsError("invalid-argument", "orderId and paymentIntentId are required.");
    }

    const orderRef = db.collection(COLLECTIONS.sponsorshipOrders).doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new HttpsError("not-found", "Sponsorship order not found.");
    const order = orderSnap.data() as { amountCents: number };

    const stripe = getStripeLive();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      throw new HttpsError("failed-precondition", `Payment not complete (status: ${pi.status}).`);
    }
    if (pi.metadata?.sponsorshipOrderId !== orderId) {
      throw new HttpsError("permission-denied", "Payment does not belong to this order.");
    }
    if (pi.amount !== order.amountCents) {
      throw new HttpsError("failed-precondition", "Payment amount does not match the order.");
    }

    await orderRef.set(
      { status: "paid", paidAt: Date.now(), stripePaymentIntentId: pi.id },
      { merge: true }
    );

    return { orderId, status: "paid" };
  }
);
