import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type Team } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { Card } from "../../../components/ui";

export function CaptainRoster({ team }: { team: Team }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clearedCount = team.roster.filter((p) => p.checkInStatus === "approved").length;

  async function saveNumber(userId: string) {
    const num = Number(draft);
    if (!draft || Number.isNaN(num)) return setError("Enter a valid number.");
    const dup = team.roster.some((p) => p.userId !== userId && p.jerseyNumber === num);
    if (dup) return setError("That number is already taken on this team.");
    setError(null);
    const roster = team.roster.map((p) => (p.userId === userId ? { ...p, jerseyNumber: num } : p));
    await updateDoc(doc(db, COLLECTIONS.teams, team.id), { roster });
    setEditing(null);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>CHECK-IN TRACKER</div>
        <div style={{ fontSize: 13, color: theme.color.textMuted }}>{clearedCount}/{team.roster.length} cleared</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {team.roster.map((p) => (
          <Card key={p.userId} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            {editing === p.userId ? (
              <>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  style={{ width: 50, padding: 6, borderRadius: 6, border: `1px solid ${theme.color.border}` }}
                />
                <button onClick={() => saveNumber(p.userId)} style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>Save</button>
                <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12 }}>Cancel</button>
              </>
            ) : (
              <span
                onClick={() => { setEditing(p.userId); setDraft(String(p.jerseyNumber ?? "")); }}
                style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 15, color: theme.color.purple, cursor: "pointer", width: 30 }}
              >
                #{p.jerseyNumber ?? "—"}
              </span>
            )}
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.displayName}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.checkInStatus === "approved" ? theme.color.success : theme.color.warning }}>
              {p.checkInStatus === "approved" ? "Cleared" : "Pending"}
            </span>
          </Card>
        ))}
      </div>
      {error && <div style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
