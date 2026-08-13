import { useState } from "react";
import { checkInStatusLabel, checkInStatusTone, TOURNAMENT_START_AT, type Team } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { setJerseyNumber } from "../../../lib/callables";
import { Card } from "../../../components/ui";

const tournamentStarted = Date.now() >= TOURNAMENT_START_AT;

/**
 * Check-in status + jersey number editing for one team's roster. No captain
 * management here — that's TeamOfficialsCard's job exclusively now, so
 * there's exactly one place to add or remove a captain instead of two (this
 * used to also carry a per-row "Make Captain" button, which was pure
 * duplication once the officials card grew its own roster-search add flow).
 * The "(C)" tag stays as a passive indicator of who currently holds it.
 */
export function RosterPanel({ team }: { team: Team }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: theme.color.textMuted }}>{team.roster.length} player{team.roster.length === 1 ? "" : "s"}</div>
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
                    {saving ? "Submitting…" : "Submit"}
                  </button>
                  <button onClick={() => { setEditing(null); setError(null); }} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12 }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span
                    title={locked ? "Locked for the rest of the tournament" : undefined}
                    style={{
                      fontFamily: theme.font.display,
                      fontWeight: 800,
                      fontSize: 15,
                      color: locked ? theme.color.textMuted : theme.color.text,
                      width: 34,
                    }}
                  >
                    {p.jerseyNumber !== undefined ? `#${p.jerseyNumber}` : "#—"}{locked && " 🔒"}
                  </span>
                  {!locked && (
                    <button
                      onClick={() => { setEditing(playerKey); setDraft(String(p.jerseyNumber ?? "")); setError(null); }}
                      style={{
                        background: "none",
                        border: `1.5px solid ${theme.color.purple}`,
                        color: theme.color.purple,
                        borderRadius: 6,
                        padding: "3px 9px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </>
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
            </Card>
          );
        })}
        {team.roster.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No players on this roster yet.</div>}
      </div>
      {error && <div style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 8 }}>{error}</div>}
      {tournamentStarted && (
        <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 8 }}>
          🔒 Jersey numbers are locked now that the tournament has started.
        </div>
      )}
    </div>
  );
}
