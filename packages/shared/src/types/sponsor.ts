import type { SponsorTier } from "./moments.js";

export const SPONSOR_TIER_ORDER: SponsorTier[] = ["legacy_builder", "impact_partner", "community_supporter", "custom"];

export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  legacy_builder: "Legacy Builder",
  impact_partner: "Impact Partner",
  community_supporter: "Community Supporter",
  custom: "Custom Partner",
};

/** Real sponsorship packages offered through the paid checkout flow. `priceCents: null` means the donor names their own amount. */
export interface SponsorshipTierInfo {
  id: SponsorTier;
  label: string;
  priceCents: number | null;
  tagline: string;
  perks: string[];
}

export const SPONSORSHIP_TIERS: SponsorshipTierInfo[] = [
  {
    id: "legacy_builder",
    label: "Legacy Builder",
    priceCents: 2_500_000,
    tagline: "Own the spotlight",
    perks: [
      "Press & social media interviews",
      "Logo on jerseys, swag & website",
      "Exclusive signage & live stream",
      "Championship trophies",
      "Keynote speaker at awards",
    ],
  },
  {
    id: "impact_partner",
    label: "Impact Partner",
    priceCents: 1_000_000,
    tagline: "Lead the conversation",
    perks: [
      "Social media interviews & event shoutout",
      "Logo on swag & website",
      "Media wall & field signage",
      "Individual awards",
    ],
  },
  {
    id: "community_supporter",
    label: "Community Supporter",
    priceCents: 500_000,
    tagline: "Capitalize the moment",
    perks: [
      "Social media interviews & event shoutout",
      "Logo on swag & website",
      "Field signage",
      "Individual awards",
    ],
  },
  {
    id: "custom",
    label: "Build Your Own",
    priceCents: null,
    tagline: "Join the movement",
    perks: ["Tell us what matters to you — we'll build a custom package together"],
  },
];

export type SponsorInquiryStatus = "new" | "contacted" | "closed";

/** A lead from the public "Become a Sponsor" CTA — reviewed by staff, not auto-approved into a real Sponsor. */
export interface SponsorInquiry {
  id: string;
  orgName: string;
  contactName: string;
  email: string;
  phone?: string;
  message?: string;
  filedByUid: string;
  status: SponsorInquiryStatus;
  createdAt: number;
}

export type SponsorshipDonorType = "business" | "individual";
export type SponsorshipOrderStatus = "pending" | "paid" | "converted" | "cancelled";

/**
 * A real-money sponsorship purchase made through Stripe Checkout (see
 * createSponsorshipCheckout). Created as "pending", flipped to "paid" by the
 * Stripe webhook, and later "converted" by an admin into a public Sponsor
 * entry (see SponsorshipOrdersAdminTab).
 */
export interface SponsorshipOrder {
  id: string;
  tierId: SponsorTier;
  amountCents: number;
  donorType: SponsorshipDonorType;
  /** Company name for a business donor, full name for an individual. */
  donorName: string;
  email: string;
  phone?: string;
  /** Business donors only. */
  companyLogoUrl?: string;
  /** Free-text notes for the "Build Your Own" custom tier. */
  customNote?: string;
  /** Optional — carried onto the public Sponsor entry once converted. */
  websiteUrl?: string;
  instagramUrl?: string;
  socialUrl?: string;
  description?: string;
  status: SponsorshipOrderStatus;
  stripeCheckoutSessionId?: string;
  filedByUid: string;
  createdAt: number;
  paidAt?: number;
  convertedSponsorId?: string;
}
