import { HUNT_LAUNCH_LABEL, type Sponsor } from "@umoja/shared";
import { theme, hunterGradient } from "../../lib/theme";
import { Card } from "../../components/ui";
import { SponsorStrip } from "../../components/SponsorStrip";

/**
 * Shown instead of the real Hunt experience until staff flip the
 * `config/hunt.started` switch on (Admin → The Hunt) — the Hunt is built and
 * seeded well before it should actually be playable.
 */
export function HuntComingSoon({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <div>
      <div style={{ background: hunterGradient, color: "#fff", padding: "28px 16px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 36 }}>🧭 THE HUNT</div>
          <div style={{ fontSize: 14, opacity: 0.92, marginTop: 6 }}>
            45 missions across 3 days, plus surprise challenges. $500 grand prize at Sunday's ceremony.
          </div>
        </div>
      </div>

      <div className="page-shell-sm" style={{ paddingTop: 24 }}>
        <Card style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
            Scavenger Hunt opens {HUNT_LAUNCH_LABEL}
          </div>
          <div style={{ color: theme.color.textMuted, fontSize: 14, lineHeight: 1.6, maxWidth: 440, margin: "0 auto" }}>
            Crews, missions, challenges, and the leaderboard all go live once the weekend kicks off. Check back
            then — or keep an eye on your notifications, we'll let you know.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 32 }}>
        <SponsorStrip sponsors={sponsors} />
      </div>
    </div>
  );
}
