import { theme } from "../lib/theme";

/**
 * A simplified schematic of the Maryland SoccerPlex layout, showing only
 * the fields Umoja Games actually uses (6, 9, 12–17) and omitting every
 * other numbered field on the venue's own map — this is a reference
 * graphic, not tied to live schedule data (the app's own FIELDS constant
 * uses "Field 1"–"Field 6"/"Stadium Field" naming, not the venue's
 * physical field numbers, so this map isn't wired into game filtering).
 */
const FIELD_BOXES: { num: string; x: number; y: number; w: number; h: number }[] = [
  // Upper cluster (bluegrass fields, near the tennis/swim complex)
  { num: "13", x: 118, y: 18, w: 46, h: 34 },
  { num: "12", x: 70, y: 60, w: 46, h: 34 },
  { num: "9", x: 122, y: 60, w: 46, h: 34 },
  { num: "6", x: 190, y: 40, w: 46, h: 34 },
  // Lower-left cluster (bermuda fields, near the trails/pond)
  { num: "15", x: 10, y: 118, w: 46, h: 34 },
  { num: "14", x: 62, y: 118, w: 46, h: 34 },
  { num: "16", x: 10, y: 158, w: 46, h: 34 },
  { num: "17", x: 62, y: 158, w: 46, h: 34 },
];

export function SoccerPlexFieldMap() {
  return (
    <div style={{ background: "#EFF6EE", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: theme.color.navy }}>MARYLAND SOCCERPLEX — OUR FIELDS</div>
        <div style={{ fontSize: 11, color: theme.color.textMuted }}>Boyds, MD</div>
      </div>
      <svg viewBox="0 0 260 210" style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
        {/* Loose trail lines for context, not to scale */}
        <path d="M0,100 C60,90 120,110 260,95" stroke="#C9C3D8" strokeWidth={2} fill="none" strokeDasharray="4 4" />
        <path d="M40,0 C60,60 50,140 30,210" stroke="#C9C3D8" strokeWidth={2} fill="none" strokeDasharray="4 4" />

        {FIELD_BOXES.map((f) => (
          <g key={f.num}>
            <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={6} fill={theme.color.success} opacity={0.85} />
            <text
              x={f.x + f.w / 2}
              y={f.y + f.h / 2 + 5}
              textAnchor="middle"
              fontSize={16}
              fontWeight={800}
              fill="#fff"
              fontFamily={theme.font.display}
            >
              {f.num}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 11, color: theme.color.textMuted, textAlign: "center", marginTop: 6 }}>
        Fields 6, 9, 12–17 · not to scale
      </div>
    </div>
  );
}
