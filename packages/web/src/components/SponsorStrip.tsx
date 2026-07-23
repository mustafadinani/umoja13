import { useState } from "react";
import { SPONSOR_TIER_LABELS, SPONSOR_TIER_ORDER, type Sponsor } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";
import { SponsorInquiryModal } from "./SponsorInquiryModal";

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const [open, setOpen] = useState<Sponsor | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const visible = sponsors.filter((s) => s.visible ?? true);
  const byTier = SPONSOR_TIER_ORDER.map((tier) => ({
    tier,
    sponsors: visible.filter((s) => (s.tier ?? "supporter") === tier).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  })).filter((g) => g.sponsors.length > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: theme.color.textMuted }}>
          PROUDLY SUPPORTED BY
        </div>
        <div onClick={() => setInquiryOpen(true)} style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.blue, cursor: "pointer" }}>
          Become a Sponsor →
        </div>
      </div>

      {byTier.length === 0 ? (
        <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No sponsors yet — be the first!</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {byTier.map(({ tier, sponsors: tierSponsors }) => (
            <div key={tier}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>{SPONSOR_TIER_LABELS[tier].toUpperCase()}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {tierSponsors.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setOpen(s)}
                    style={{
                      padding: tier === "title" ? "14px 22px" : "10px 16px",
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.color.border}`,
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: tier === "title" ? 16 : 13.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {s.logoUrl && <img src={s.logoUrl} alt="" style={{ height: tier === "title" ? 28 : 20, objectFit: "contain" }} />}
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal onClose={() => setOpen(null)}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>{open.name}</div>
          <div style={{ fontSize: 13, color: theme.color.textMuted, margin: "4px 0 14px" }}>{open.tagline}</div>
          <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: open.websiteUrl ? 16 : 0 }}>{open.story}</div>
          {open.websiteUrl && (
            <PrimaryButton onClick={() => window.open(open.websiteUrl, "_blank")} style={{ width: "100%" }}>VISIT WEBSITE</PrimaryButton>
          )}
        </Modal>
      )}
      {inquiryOpen && <SponsorInquiryModal onClose={() => setInquiryOpen(false)} />}
    </div>
  );
}
