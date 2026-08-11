import { useState } from "react";
import { SPONSORSHIP_TIERS, VENUE, type SponsorTier } from "@umoja/shared";
import { theme, heroGradient } from "../lib/theme";
import { useIsMobile } from "../hooks/useMediaQuery";
import { useSponsors } from "../hooks/useData";
import { Card, PrimaryButton } from "../components/ui";
import { SponsorStrip } from "../components/SponsorStrip";
import { SponsorshipCheckoutModal } from "../components/SponsorshipCheckoutModal";
import { SponsorInquiryModal } from "../components/SponsorInquiryModal";

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

const PILLARS = [
  {
    icon: "💡",
    color: theme.color.blue,
    title: "Grassroots movement",
    body: "501(c)(3) nonprofit foundation on a mission to bring the Muslim community together beyond color, ethnicity, and culture.",
  },
  {
    icon: "⚽",
    color: theme.color.teal,
    title: "Soccer fanatics",
    body: "Founded by Muslim athletes in 2012 who have dedicated their entire life to soccer, community service, and social impact.",
  },
  {
    icon: "📣",
    color: theme.color.pink,
    title: "Muslim unity",
    body: "We strive to bring unity around the division within the Muslim community through soccer and youth mentorship.",
  },
];

// Umoja Games is the flagship/marquee program — it renders full-width above
// the other two so it reads as the anchor, not one of three equal tiles.
const MARQUEE_PROGRAM = {
  tag: "FLAGSHIP · GLOBAL",
  tagColor: theme.color.pink,
  title: "Umoja Games",
  body: "Our flagship annual tournament brings together Muslims of all ages from around the world for competition, connection, and celebration at premier soccer venues.",
};

const PROGRAMS = [
  {
    tag: "LOCAL",
    tagColor: theme.color.teal,
    title: "Umoja Academy Training",
    body: "A weekly soccer training program active in many US and Canadian cities that offers top coaches, uses a proven development curriculum, and builds lasting connections for Muslim families and youth.",
  },
  {
    tag: "CAREERS",
    tagColor: theme.color.orange,
    title: "Internships & Jobs",
    body: "Real internship and employment pathways for youth and young professionals — turning involvement in Umoja Games and the Academy into hands-on career experience and mentorship.",
  },
];

const IMPACT_STATS = [
  { value: "100+", label: "Muslim communities represented" },
  { value: "10,000+", label: "Muslim youth united" },
  { value: "3,000+", label: "Underserved members reached" },
];

const BENEFITS = [
  "Meaningful alignment with youth and community impact",
  "Direct exposure to thousands of attendees",
  "Visibility across event signage, apparel, awards, livestreams, and digital channels",
  "Authentic engagement with a growing Muslim family audience",
  "Association with a trusted 501(c)(3) nonprofit mission",
];

export function Donate() {
  const isMobile = useIsMobile();
  const { data: sponsors } = useSponsors();
  const [checkoutTier, setCheckoutTier] = useState<SponsorTier | null | "closed">("closed");
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <div>
      <div style={{ background: heroGradient, color: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "36px 20px 32px" : "56px 24px 48px", textAlign: "center" }}>
          <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: 2, opacity: 0.85 }}>
            UMOJA OUTREACH FOUNDATION · A 501(C)(3) NONPROFIT ORGANIZATION
          </div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 34 : 52, lineHeight: 1.02, marginTop: 12 }}>
            PARTNER WITH A MOVEMENT
          </div>
          <div style={{ marginTop: 14, fontSize: isMobile ? 15 : 18, opacity: 0.92, maxWidth: 620, margin: "14px auto 0" }}>
            Uniting and impacting Muslim families through sport and community engagement.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 26 }}>
            <button
              onClick={() => setCheckoutTier(null)}
              style={{ background: "#fff", color: theme.color.navy, fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 15 : 17, letterSpacing: 1, padding: isMobile ? "12px 22px" : "14px 28px", borderRadius: 12, border: "none", cursor: "pointer" }}
            >
              🤝 BECOME A SPONSOR
            </button>
            <button
              onClick={() => setInquiryOpen(true)}
              style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.4)", color: "#fff", fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 15 : 17, letterSpacing: 1, padding: isMobile ? "12px 22px" : "14px 28px", borderRadius: 12, cursor: "pointer" }}
            >
              TALK TO OUR TEAM
            </button>
          </div>
        </div>
      </div>

      <div className="page-shell" style={{ maxWidth: 1040 }}>
        <SectionLabel eyebrow="WHO WE ARE" title="Uniting the Muslim community through soccer" />
        <div className="grid-3" style={{ marginBottom: 48 }}>
          {PILLARS.map((p) => (
            <Card key={p.title}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>
                {p.icon}
              </div>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 6, color: p.color }}>{p.title.toUpperCase()}</div>
              <div style={{ fontSize: 13.5, color: theme.color.textMuted, lineHeight: 1.5 }}>{p.body}</div>
            </Card>
          ))}
        </div>

        <SectionLabel eyebrow="OUR PROGRAMS" title="Creating real and lasting impact" />
        <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: 20 }}>
            <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: "#fff", background: MARQUEE_PROGRAM.tagColor, borderRadius: 999, padding: "3px 10px", marginBottom: 10 }}>
              {MARQUEE_PROGRAM.tag}
            </span>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 6 }}>{MARQUEE_PROGRAM.title}</div>
            <div style={{ fontSize: 14, color: theme.color.textMuted, lineHeight: 1.5, maxWidth: 640 }}>{MARQUEE_PROGRAM.body}</div>
          </div>
        </Card>
        <div className="grid-2-equal" style={{ marginBottom: 48 }}>
          {PROGRAMS.map((p) => (
            <Card key={p.title} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: 18 }}>
                <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: "#fff", background: p.tagColor, borderRadius: 999, padding: "3px 10px", marginBottom: 10 }}>
                  {p.tag}
                </span>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 19, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 13.5, color: theme.color.textMuted, lineHeight: 1.5 }}>{p.body}</div>
              </div>
            </Card>
          ))}
        </div>

        <SectionLabel eyebrow="OUR IMPACT" title="Impacting thousands of Muslim families and youth" />
        <div className="grid-3" style={{ marginBottom: 16 }}>
          {IMPACT_STATS.map((s) => (
            <div key={s.label} style={{ background: theme.color.navy, color: "#fff", borderRadius: theme.radius.lg, padding: "24px 18px", textAlign: "center" }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 36 }}>{s.value}</div>
              <div style={{ fontSize: 12.5, color: "#C7C1DB", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", color: theme.color.textMuted, fontSize: 13.5, fontStyle: "italic", marginBottom: 48 }}>
          Our events and programs do more than promote sport. They create friendship, mentorship, representation, and a stronger sense of Muslim belonging.
        </div>

        <Card style={{ marginBottom: 48, padding: 24 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 36, flexShrink: 0 }}>“</div>
            <div style={{ flex: "1 1 320px" }}>
              <div style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 12 }}>
                Umoja helped my children find and reconnect with their friends who they had lost contact with since living together in refugee camps in Indonesia. Umoja has had a huge impact on these children, much beyond soccer to real-life connections and a sense of community.
              </div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>Nolan Leblanc</div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>Foster parent to refugee children</div>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: 48, padding: 24, textAlign: "center" }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>UMOJA GAMES 2026</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>{VENUE.name} · {VENUE.dates}</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28, color: theme.color.purple, marginTop: 10 }}>5,000+</div>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>attendees from all over the world</div>
        </Card>

        <SectionLabel eyebrow="WHY SPONSOR UMOJA" title="Connect your brand with impact, visibility, and trust" />
        <Card style={{ marginBottom: 48 }}>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
            {BENEFITS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Card>

        <SectionLabel eyebrow="GET INVOLVED" title="Pick a package, or build your own" />
        <div className="grid-2-equal" style={{ marginBottom: 48 }}>
          {SPONSORSHIP_TIERS.map((t) => (
            <Card key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>{t.label}</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, color: theme.color.purple, whiteSpace: "nowrap" }}>
                  {t.priceCents != null ? formatDollars(t.priceCents) : "Name your amount"}
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, fontStyle: "italic", marginBottom: 10 }}>{t.tagline}</div>
              <ul style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: theme.color.text }}>
                {t.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <PrimaryButton onClick={() => setCheckoutTier(t.id)} style={{ width: "100%" }}>
                {t.priceCents != null ? `SPONSOR AT ${formatDollars(t.priceCents)}` : "BUILD YOUR PACKAGE"}
              </PrimaryButton>
            </Card>
          ))}
        </div>

        <div style={{ background: theme.color.navy, color: "#fff", borderRadius: theme.radius.lg, padding: isMobile ? 24 : 32, textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 22 : 28, marginBottom: 8 }}>LET'S BUILD THIS TOGETHER</div>
          <div style={{ color: "#C7C1DB", fontSize: 13.5, marginBottom: 18 }}>
            Partner with us and showcase your brand, while making a lasting impact.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setCheckoutTier(null)}
              style={{ background: theme.color.gold, color: theme.color.navy, fontFamily: theme.font.display, fontWeight: 800, fontSize: 15, letterSpacing: 1, padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer" }}
            >
              🤝 BECOME A SPONSOR
            </button>
            <button
              onClick={() => setInquiryOpen(true)}
              style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", fontFamily: theme.font.display, fontWeight: 800, fontSize: 15, letterSpacing: 1, padding: "12px 24px", borderRadius: 12, cursor: "pointer" }}
            >
              SEND AN INQUIRY
            </button>
          </div>
          <div style={{ marginTop: 18, fontSize: 12.5, color: "#A79FC0" }}>
            www.umojaoutreach.org · games@umojaoutreach.org
          </div>
        </div>

        <SponsorStrip sponsors={sponsors} />
      </div>

      {checkoutTier !== "closed" && (
        <SponsorshipCheckoutModal onClose={() => setCheckoutTier("closed")} initialTierId={checkoutTier ?? undefined} />
      )}
      {inquiryOpen && <SponsorInquiryModal onClose={() => setInquiryOpen(false)} />}
    </div>
  );
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, color: theme.color.pink }}>{eyebrow}</div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 24, marginTop: 4 }}>{title}</div>
    </div>
  );
}
