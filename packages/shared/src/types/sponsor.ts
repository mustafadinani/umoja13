import type { SponsorTier } from "./moments.js";

export const SPONSOR_TIER_ORDER: SponsorTier[] = ["title", "official", "supporter"];

export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  title: "Title Partner",
  official: "Official Partners",
  supporter: "Supporters",
};

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
