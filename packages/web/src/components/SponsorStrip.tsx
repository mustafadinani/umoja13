import { useState } from "react";
import { Link } from "react-router-dom";
import { SPONSOR_TIER_LABELS, SPONSOR_TIER_ORDER, type Sponsor, type SponsorTier } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";

// One accent per tier, reused for the tier pill, tagline, and primary button
// in the popup — gives "tier" a visual identity beyond the label text, using
// colors already in the app's palette rather than introducing new ones.
const TIER_ACCENT: Record<SponsorTier, string> = {
  legacy_builder: theme.color.purple,
  impact_partner: theme.color.blue,
  community_supporter: theme.color.teal,
  custom: theme.color.gold,
};

const TIER_EMOJI: Record<SponsorTier, string> = {
  legacy_builder: "👑",
  impact_partner: "⚡",
  community_supporter: "🤝",
  custom: "💜",
};

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const [open, setOpen] = useState<Sponsor | null>(null);

  const visible = sponsors.filter((s) => s.visible ?? true);
  const byTier = SPONSOR_TIER_ORDER.map((tier) => ({
    tier,
    sponsors: visible.filter((s) => (s.tier ?? "community_supporter") === tier).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  })).filter((g) => g.sponsors.length > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: theme.color.textMuted }}>
          PROUDLY SUPPORTED BY
        </div>
        <Link to="/donate" style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.blue }}>
          Support Us →
        </Link>
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
                      padding: tier === "legacy_builder" ? "14px 22px" : "10px 16px",
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.color.border}`,
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: tier === "legacy_builder" ? 16 : 13.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt={s.name} style={{ height: tier === "legacy_builder" ? 40 : 32, objectFit: "contain" }} />
                    ) : (
                      s.name
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <SponsorModal sponsor={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/**
 * Plain white popup — no colored hero band. The tier still gets a visual
 * identity (pill + logo-badge ring + button color), it just doesn't come
 * from a full-bleed gradient anymore. A sponsor with only a name/logo (the
 * common case, since the admin form has no `story` field) still gets a
 * complete-feeling card via the default thank-you line, instead of trailing
 * off into empty space below the name.
 */
function SponsorModal({ sponsor, onClose }: { sponsor: Sponsor; onClose: () => void }) {
  const tier = sponsor.tier ?? "community_supporter";
  const accent = TIER_ACCENT[tier];

  function openInstagram() {
    const handle = sponsor.instagramUrl!;
    window.open(handle.startsWith("http") ? handle : `https://instagram.com/${handle.replace(/^@/, "")}`, "_blank");
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: "center" }}>
        {sponsor.logoUrl ? (
          <img
            src={sponsor.logoUrl}
            alt={sponsor.name}
            style={{ maxHeight: 64, maxWidth: "70%", objectFit: "contain", margin: "0 auto 14px" }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: theme.radius.md,
              background: `${accent}1A`,
              border: `1.5px solid ${accent}`,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              fontFamily: theme.font.display,
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            {sponsor.name.trim().slice(0, 2).toUpperCase() || "?"}
          </div>
        )}

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
            color: accent,
            background: `${accent}1A`,
            padding: "4px 12px",
            borderRadius: theme.radius.pill,
            marginBottom: 10,
          }}
        >
          {TIER_EMOJI[tier]} {SPONSOR_TIER_LABELS[tier]}
        </div>

        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>{sponsor.name}</div>
        {sponsor.tagline && (
          <div style={{ fontSize: 13.5, fontWeight: 600, color: accent, margin: "4px 0 0" }}>{sponsor.tagline}</div>
        )}
      </div>

      {sponsor.story ? (
        <div style={{ fontSize: 14.5, lineHeight: 1.6, textAlign: "left", margin: "18px 0 0" }}>{sponsor.story}</div>
      ) : (
        <div style={{ fontSize: 14, lineHeight: 1.6, textAlign: "center", color: theme.color.textMuted, margin: "18px 0 0" }}>
          Proudly supporting Umoja Games and every kid on the field this season.
        </div>
      )}
      {sponsor.description && (
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: theme.color.textMuted, textAlign: "left", margin: "10px 0 0" }}>
          {sponsor.description}
        </div>
      )}

      {(sponsor.websiteUrl || sponsor.instagramUrl || sponsor.socialUrl) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {sponsor.websiteUrl && (
            <PrimaryButton
              onClick={() => window.open(sponsor.websiteUrl, "_blank")}
              style={{ width: "100%", background: accent }}
            >
              🌐 VISIT WEBSITE
            </PrimaryButton>
          )}
          {sponsor.instagramUrl && (
            <button onClick={openInstagram} style={secondaryBtnStyle}>📷 INSTAGRAM</button>
          )}
          {sponsor.socialUrl && (
            <button onClick={() => window.open(sponsor.socialUrl, "_blank")} style={secondaryBtnStyle}>🔗 MORE SOCIAL LINKS</button>
          )}
        </div>
      )}
    </Modal>
  );
}

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: `1px solid ${theme.color.border}`,
  borderRadius: theme.radius.sm,
  padding: "10px",
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
};
