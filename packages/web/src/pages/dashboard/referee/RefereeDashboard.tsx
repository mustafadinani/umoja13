import { where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "@umoja/shared";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useGames } from "../../../hooks/useData";
import { Card, StatusBadge } from "../../../components/ui";

export function RefereeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: games } = useGames(user ? [where("refereeUid", "==", user.uid)] : []);

  const sorted = [...games].sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));
  const gateNeeded = sorted.filter((g) => g.status !== "final" && g.status !== "forfeited" && !g.gateCheck?.completedAt);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>REFEREE</div>
      <div style={{ color: theme.color.textMuted, fontSize: 14, marginBottom: 20 }}>
        Tap into your game for gate check, match console, and game-card submission.
      </div>

      {gateNeeded.length > 0 && (
        <Card style={{ background: theme.color.warningBg, border: "none", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: theme.color.warning }}>
            {gateNeeded.length} game{gateNeeded.length > 1 ? "s" : ""} still need a gate check
          </div>
        </Card>
      )}

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>YOUR ASSIGNMENTS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((g) => (
          <Card key={g.id} onClick={() => navigate(`/referee/game/${g.id}`)} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId}</div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>
                {g.day.toUpperCase()} · {g.field} · {g.kickoffTime}
                {!g.gateCheck?.completedAt && g.status !== "final" && (
                  <span style={{ color: theme.color.warning, fontWeight: 700 }}> · Gate check needed</span>
                )}
              </div>
            </div>
            <StatusBadge status={g.status} />
          </Card>
        ))}
        {sorted.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No games assigned yet.</div>}
      </div>
    </div>
  );
}
