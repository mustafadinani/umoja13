import { FIELDS, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * A clickable schematic of the tournament's fields — clicking a box sets/
 * clears the caller's field filter. Boxes are labeled with the app's own
 * FIELDS vocabulary ("Field 1"–"Field 6", "Stadium Field") since that's
 * what Game.field actually contains; this is a loosely stylized layout for
 * visual flavor, not a literal reproduction of the venue's own physical
 * field numbering (which games in this app never reference).
 */
const FIELD_BOXES: { label: (typeof FIELDS)[number]; x: number; y: number; w: number; h: number }[] = [
  { label: "Field 1", x: 16, y: 14, w: 66, h: 48 },
  { label: "Field 2", x: 92, y: 14, w: 66, h: 48 },
  { label: "Field 3", x: 168, y: 14, w: 66, h: 48 },
  { label: "Field 4", x: 16, y: 72, w: 66, h: 48 },
  { label: "Field 5", x: 92, y: 72, w: 66, h: 48 },
  { label: "Field 6", x: 168, y: 72, w: 66, h: 48 },
  { label: "Stadium Field", x: 16, y: 138, w: 218, h: 52 },
];

export function FieldMap({
  games,
  selectedField,
  onSelectField,
  large = false,
}: {
  games: Game[];
  selectedField: string | null;
  onSelectField: (field: string | null) => void;
  large?: boolean;
}) {
  return (
    <svg viewBox="0 0 250 210" style={{ width: "100%", maxWidth: large ? 480 : 320, display: "block", margin: "0 auto" }}>
      {/* Loose trail lines for context, not to scale */}
      <path d="M0,105 C60,95 150,115 250,100" stroke="#C9C3D8" strokeWidth={2} fill="none" strokeDasharray="4 4" />

      {FIELD_BOXES.map((f) => {
        const fieldGames = games.filter((g) => g.field === f.label);
        const isLive = fieldGames.some((g) => g.status === "live");
        const isSelected = selectedField === f.label;
        const fill = isSelected ? theme.color.purple : isLive ? theme.color.pink : theme.color.success;

        return (
          <g
            key={f.label}
            onClick={() => onSelectField(isSelected ? null : f.label)}
            style={{ cursor: "pointer" }}
            role="button"
            aria-label={`Filter by ${f.label}`}
          >
            <rect
              x={f.x}
              y={f.y}
              width={f.w}
              height={f.h}
              rx={8}
              fill={fill}
              opacity={0.9}
              stroke={isSelected ? theme.color.navy : "none"}
              strokeWidth={isSelected ? 3 : 0}
            />
            <text
              x={f.x + f.w / 2}
              y={f.y + f.h / 2 + (f.label === "Stadium Field" ? 6 : 5)}
              textAnchor="middle"
              fontSize={f.label === "Stadium Field" ? 15 : 14}
              fontWeight={800}
              fill="#fff"
              fontFamily={theme.font.display}
            >
              {f.label === "Stadium Field" ? "STADIUM" : f.label.replace("Field ", "")}
            </text>
            {isLive && (
              <circle cx={f.x + f.w - 10} cy={f.y + 10} r={5} fill={theme.color.danger}>
                <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
