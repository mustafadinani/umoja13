import { HUNT_RULES, HUNT_RULES_CONTACT_EMAIL, HUNT_RULES_VERSION } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * Official Rules for the Umoja Games 2026 Scavenger Hunt — required by App
 * Store Guideline 5.3.2 to be available at all times, not just shown once.
 * Content lives in @umoja/shared's huntRules.ts so mobile's HuntRulesScreen
 * renders the identical text. Same page shape as Privacy.tsx.
 */
export function HuntRules() {
  return (
    <div className="page-shell-sm" style={{ maxWidth: 720 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>
        HUNT OFFICIAL RULES
      </div>
      <p style={{ color: theme.color.textMuted, fontSize: 13, margin: "0 0 28px" }}>Last updated {HUNT_RULES_VERSION}</p>

      {HUNT_RULES.map((section) => (
        <div key={section.title} style={{ marginBottom: 26 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: theme.color.navy }}>{section.title}</div>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6, color: theme.color.text, fontSize: 14 }}>
            {section.bullets.map((b, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p style={{ color: theme.color.textMuted, fontSize: 12.5 }}>
        Questions? Email <a href={`mailto:${HUNT_RULES_CONTACT_EMAIL}`}>{HUNT_RULES_CONTACT_EMAIL}</a>.
      </p>
    </div>
  );
}
