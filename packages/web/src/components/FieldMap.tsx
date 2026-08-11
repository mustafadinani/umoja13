import { FIELD_CLUSTERS, PRIVATE_GAME_FIELD, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";

/**
 * Pixel-position hotspots (as % of the 745×558 venue map image) for each
 * numbered field the tournament actually uses — read off the real Maryland
 * SoccerPlex complex map (Umoja13 Toddler Camp schedule PDF, page 3).
 * Fields not in this tournament's set (1-6, 8, 10-11, 18-24) are shown on
 * the map for real-world orientation but have no hotspot — nothing is
 * scheduled there. Field 7's coordinates are the same spot field 5 used to
 * occupy — the venue relabeled the tournament's field, not its location.
 */
const MAP_HOTSPOTS: { cluster: string; label: string; xPct: number; yPct: number }[] = [
  { cluster: "Field 7", label: "7", xPct: 47.9, yPct: 15.1 },
  { cluster: "Field 9", label: "9", xPct: 32.9, yPct: 20.8 },
  { cluster: "Field 12", label: "12", xPct: 28.3, yPct: 20.8 },
  { cluster: "Field 13", label: "13", xPct: 25.4, yPct: 16.3 },
  { cluster: "Field 14", label: "14", xPct: 21.3, yPct: 27.2 },
  { cluster: "Field 15", label: "15", xPct: 17.2, yPct: 28.7 },
  { cluster: "Field 16", label: "16", xPct: 17.2, yPct: 35.7 },
  { cluster: "Field 17", label: "17", xPct: 21.6, yPct: 39.8 },
];

/**
 * The real venue map image, with a clickable hotspot on each numbered field
 * this tournament actually plays on — clicking one selects that cluster's
 * first sub-pitch, same as clicking its chip in the schematic grid rendered
 * underneath (so both stay in sync either way a field gets picked).
 */
function VenueMapImage({
  selectedCluster,
  onSelectCluster,
  large,
}: {
  selectedCluster: string | null;
  onSelectCluster: (cluster: string) => void;
  large: boolean;
}) {
  return (
    <div style={{ position: "relative", width: "100%", marginBottom: 14 }}>
      <img
        src="/soccerplex-map.png"
        alt="Maryland SoccerPlex complex map"
        style={{ width: "100%", display: "block", borderRadius: theme.radius.md, border: `1px solid ${theme.color.border}` }}
      />
      {MAP_HOTSPOTS.map((h) => {
        const active = selectedCluster === h.cluster;
        return (
          <button
            key={h.cluster}
            onClick={() => onSelectCluster(h.cluster)}
            aria-label={`Select ${h.cluster}`}
            style={{
              position: "absolute",
              left: `${h.xPct}%`,
              top: `${h.yPct}%`,
              transform: "translate(-50%,-50%)",
              width: large ? 30 : 22,
              height: large ? 30 : 22,
              borderRadius: "50%",
              border: `2px solid ${active ? theme.color.purple : "#fff"}`,
              background: active ? theme.color.purple : "rgba(139,47,209,.28)",
              color: "#fff",
              fontWeight: 800,
              fontSize: large ? 12 : 10,
              cursor: "pointer",
              padding: 0,
              boxShadow: "0 1px 3px rgba(0,0,0,.35)",
            }}
          >
            {h.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A clickable grid of the tournament's actual sub-pitches — each numbered
 * field (7, 9, 12-17) is really 2-3 concurrent mini-pitches sharing that
 * field, one per game format (Field 7 has a 4th, 7D, but that one's Umoja
 * Soccer Camp's location, not a game format — see FIELD_CLUSTERS), so a
 * real field visit needs the sub-pitch
 * code (e.g. "12B"), not just "Field 12". Clicking a chip sets/clears the
 * caller's field filter. Rebuilt from an earlier SVG schematic (keyed only
 * to the coarse cluster) once real games started being scheduled on the
 * fine-grained codes — that older version could no longer actually match
 * any game's `field`. The real venue map image sits above this grid, with
 * hotspots on each numbered field driving the exact same selection.
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
  const selectedCluster = selectedField ? FIELD_CLUSTERS.find((c) => c.pitches.includes(selectedField))?.cluster ?? null : null;

  function selectCluster(cluster: string) {
    const c = FIELD_CLUSTERS.find((fc) => fc.cluster === cluster);
    if (!c) return;
    const firstPitch = c.pitches[0];
    onSelectField(selectedCluster === cluster ? null : firstPitch);
  }

  return (
    <div style={{ maxWidth: large ? 480 : 320, margin: "0 auto" }}>
      <VenueMapImage selectedCluster={selectedCluster} onSelectCluster={selectCluster} large={large} />
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
