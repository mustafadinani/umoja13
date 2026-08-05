import { useNavigate } from "react-router-dom";
import type { Game } from "@umoja/shared";
import { theme } from "../lib/theme";
import { FieldMap } from "./FieldMap";
import { Card } from "./ui";

/** Compact, embeddable field map for the Game Day page — click a field to filter the schedule, or jump to the full-page version. */
export function FieldMapCard({
  games,
  selectedField,
  onSelectField,
}: {
  games: Game[];
  selectedField: string | null;
  onSelectField: (field: string | null) => void;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, letterSpacing: 0.5, marginBottom: 10 }}>FIELD MAP</div>
      <FieldMap games={games} selectedField={selectedField} onSelectField={onSelectField} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontSize: 11.5, color: theme.color.textMuted }}>Tap a field to filter the schedule.</div>
        <div onClick={() => navigate("/schedule/map")} style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.blue, cursor: "pointer", whiteSpace: "nowrap" }}>
          Full field map →
        </div>
      </div>
    </Card>
  );
}
