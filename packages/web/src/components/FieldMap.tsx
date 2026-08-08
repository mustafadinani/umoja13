import { FIELD_CLUSTERS, PRIVATE_GAME_FIELD, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * A clickable grid of the tournament's actual sub-pitches — each numbered
 * field (5, 9, 12-17) is really 2-3 concurrent mini-pitches sharing that
 * field, one per game format, so a real field visit needs the sub-pitch
 * code (e.g. "12B"), not just "Field 12". Clicking a chip sets/clears the
 * caller's field filter. Rebuilt from an earlier SVG schematic (keyed only
 * to the coarse cluster) once real games started being scheduled on the
 * fine-grained codes — that older version could no longer actually match
 * any game's `field`.
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
    <div style={{ maxWidth: large ? 480 : 320, margin: "0 auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: large ? "repeat(4, 1fr)" : "repeat(2, 1fr)",
          gap: 10,
          marginBottom: 10,
        }}
      >
        {FIELD_CLUSTERS.map((c) => (
          <div key={c.cluster} style={{ border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: 10, background: theme.color.bg }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.textMuted, marginBottom: 7, letterSpacing: 0.3 }}>
              {c.cluster.toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {c.pitches.map((pitch) => {
                const pitchGames = games.filter((g) => g.field === pitch);
                const isLive = pitchGames.some((g) => g.status === "live");
                const isSelected = selectedField === pitch;
                const bg = isSelected ? theme.color.purple : isLive ? theme.color.pink : theme.color.success;
                return (
                  <div
                    key={pitch}
                    onClick={() => onSelectField(isSelected ? null : pitch)}
                    role="button"
                    aria-label={`Filter by ${pitch}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      background: bg,
                      color: "#fff",
                      borderRadius: 7,
                      padding: "6px 9px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <span>{pitch}</span>
                    {pitch === PRIVATE_GAME_FIELD && <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>🔒</span>}
                    {isLive && (
                      <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: theme.color.danger, animation: "umPulse 1.6s infinite" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div
        onClick={() => onSelectField(selectedField === "Stadium Field" ? null : "Stadium Field")}
        style={{
          border: `1px solid ${theme.color.border}`,
          borderRadius: theme.radius.md,
          padding: 12,
          textAlign: "center",
          background: selectedField === "Stadium Field" ? theme.color.purple : theme.color.bg,
          color: selectedField === "Stadium Field" ? "#fff" : theme.color.textMuted,
          fontFamily: theme.font.display,
          fontWeight: 800,
          letterSpacing: 1,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        STADIUM
      </div>
    </div>
  );
}
