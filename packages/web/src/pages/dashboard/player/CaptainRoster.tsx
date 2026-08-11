import { useState } from "react";
import { checkInStatusLabel, checkInStatusTone, TOURNAMENT_START_AT, type Team } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { assignTeamCaptain, removeTeamCaptain, setJerseyNumber } from "../../../lib/callables";
import { Card } from "../../../components/ui";

const tournamentStarted = Date.now() >= TOURNAMENT_START_AT;

/**
 * `canAppointCaptain` is true only when this render is a coach/manager's own
 * "TEAM MANAGER TOOLS" view of a team they don't play on themselves (see
 * PlayerDashboard.tsx) — a real captain viewing their own roster never gets
 * this action, matching the literal ask ("the coach should also be able to
 * mark someone as captain").
 */
export function CaptainRoster({ team, canAppointCaptain }: { team: Team; canAppointCaptain?: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captainBusyKey, setCaptainBusyKey] = useState<string | null>(null);
  const clearedCount = team.roster.filter((p) => p.checkInStatus === "approved").length;

  async function saveNumber(playerKey: string) {
    const num = Number(draft);
    if (!draft || Number.isNaN(num) || num < 0 || num > 999) return setError("Enter a valid number (0–999).");
    setSaving(true);
    setError(null);
    try {
      await setJerseyNumber({ teamId: team.id, playerKey, categoryId: team.categoryId, jerseyNumber: num });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that number.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCaptain(playerKey: string, targetUid: string, makeCaptain: boolean) {
    setCaptainBusyKey(playerKey);
    setError(null);
    try {
      if (makeCaptain) {
        await assignTeamCaptain({ teamId: team.id, categoryId: team.categoryId, playerKey, targetUid });
      } else {
        await removeTeamCaptain({ teamId: team.id, categoryId: team.categoryId, playerKey });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update captain status.");
    } finally {
      setCaptainBusyKey(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>CHECK-IN TRACKER</div>
        <div style={{ fontSize: 13, color: theme.color.textMuted }}>{clearedCount}/{team.roster.length} verified</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {team.roster.map((p) => {
          const locked = tournamentStarted;
          const playerKey = p.playerKey ?? p.userId;
          return (
            <Card key={playerKey} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {editing === playerKey ? (
                <>
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                    style={{ width: 50, padding: 6, borderRadius: 6, border: `1px solid ${theme.color.border}` }}
                  />
                  <button
                    disabled={saving}
                    onClick={() => saveNumber(playerKey)}
                    style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => { setEditing(null); setError(null); }} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12 }}>
                    Cancel
                  </button>
                </>
              ) : (
                <span
                  onClick={() => {
                    if (locked) return;
                    setEditing(playerKey);
                    setDraft(String(p.jerseyNumber ?? ""));
                    setError(null);
                  }}
                  title={locked ? "Locked for the rest of the tournament" : "Tap to edit"}
                  style={{
                    fontFamily: theme.font.display,
                    fontWeight: 800,
                    fontSize: 15,
                    color: locked ? theme.color.textMuted : theme.color.purple,
                    cursor: locked ? "default" : "pointer",
                    width: 34,
                  }}
                >
                  #{p.jerseyNumber ?? "—"}{locked && " 🔒"}
                </span>
              )}
              <span style={{ flex: 1, minWidth: 120, fontWeight: 600, fontSize: 14 }}>
                {p.displayName}{p.isCaptain ? " (C)" : ""}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: { success: theme.color.success, warning: theme.color.warning, muted: theme.color.textMuted, danger: theme.color.danger }[checkInStatusTone(p.checkInStatus)],
                }}
              >
                {checkInStatusLabel(p.checkInStatus)}
              </span>
              {canAppointCaptain && (
                <button
                  disabled={captainBusyKey === playerKey}
                  onClick={() => toggleCaptain(playerKey, p.userId, !p.isCaptain)}
                  style={{
                    background: p.isCaptain ? "none" : theme.color.purple,
                    color: p.isCaptain ? theme.color.textMuted : "#fff",
                    border: p.isCaptain ? `1px solid ${theme.color.border}` : "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {captainBusyKey === playerKey ? "…" : p.isCaptain ? "Remove Captain" : "Make Captain"}
                </button>
              )}
            </Card>
          );
        })}
      </div>
      {error && <div style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 6 }}>{error}</div>}
      {tournamentStarted && (
        <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 8 }}>
          🔒 Jersey numbers are locked now that the tournament has started.
        </div>
      )}
    </div>
  );
}
