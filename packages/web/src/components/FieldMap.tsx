import { FIELD_BOXES, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * A clickable schematic of the tournament's fields — clicking a box sets/
 * clears the caller's field filter. Boxes come from the shared FIELD_BOXES
 * layout (also used by mobile's View-based field map), labeled with the
 * app's own FIELDS vocabulary, which matches Maryland SoccerPlex's own field
 * numbering (5, 9, 12-17, plus the Stadium Field) since that's what Umoja
 * Games actually plays on; this is a loosely stylized layout for visual
 * flavor, not a literal to-scale reproduction of the venue.
 */

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
    <svg viewBox="0 0 250 260" style={{ width: "100%", maxWidth: large ? 480 : 320, display: "block", margin: "0 auto" }}>
      {/* Loose trail lines for context, not to scale */}
      <path d="M0,160 C60,150 150,170 250,155" stroke="#C9C3D8" strokeWidth={2} fill="none" strokeDasharray="4 4" />

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
