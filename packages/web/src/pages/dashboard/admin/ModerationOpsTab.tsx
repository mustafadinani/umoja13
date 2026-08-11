import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useAllMoments, useGames, useIncidents, useTeams } from "../../../hooks/useData";
import { backfillTeamRosterAccess } from "../../../lib/callables";
import { Card } from "../../../components/ui";

export function ModerationOpsTab() {
  const { data: moments } = useAllMoments();
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const { data: incidents } = useIncidents();
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const pendingMoments = moments.filter((m) => m.moderationStatus === "pending");
  const checkedInPct = teams.length
    ? Math.round((teams.flatMap((t) => t.roster).filter((p) => p.checkInStatus === "approved").length / Math.max(1, teams.flatMap((t) => t.roster).length)) * 100)
    : 0;
  const openIncidents = incidents.filter((i) => i.status === "submitted" || i.status === "under_review").length;

  async function moderate(momentId: string, status: "approved" | "rejected") {
    await updateDoc(doc(db, COLLECTIONS.moments, momentId), { moderationStatus: status });
  }

  async function runRosterBackfill() {
    setBackfillBusy(true);
    setBackfillResult(null);
    try {
      const res = await backfillTeamRosterAccess();
      setBackfillResult(`Fixed channel access for ${res.data.teamsFixed} teams.`);
    } catch (e) {
      setBackfillResult(e instanceof Error ? `Failed: ${e.message}` : "Failed.");
    } finally {
      setBackfillBusy(false);
    }
  }

  return (
    <div>
      <div className="grid-kpi-4" style={{ marginBottom: 24 }}>
        <Kpi label="Verified" value={`${checkedInPct}%`} />
        <Kpi label="Games total" value={String(games.length)} />
        <Kpi label="Uploads awaiting review" value={String(pendingMoments.length)} />
        <Kpi label="Open cases" value={String(openIncidents)} />
      </div>

      <Card style={{ padding: 16, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Fix team channel access (one-time)</div>
        <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
          Team channel read/reply access used to be based on an old, frozen roster from before the
          Outreach registration import — not who's actually on the team today. New player moves keep
          it correct automatically now, but run this once to immediately fix every existing team's
          access to match their real current roster.
        </div>
        <button
          disabled={backfillBusy}
          onClick={runRosterBackfill}
          style={{
            background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6,
            padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: backfillBusy ? "default" : "pointer",
            opacity: backfillBusy ? 0.6 : 1,
          }}
        >
          {backfillBusy ? "Fixing…" : "Fix team channel access"}
        </button>
        {backfillResult && <div style={{ fontSize: 12.5, marginTop: 8, color: theme.color.text }}>{backfillResult}</div>}
      </Card>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MODERATION QUEUE</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pendingMoments.map((m) => (
          <Card key={m.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 60, height: 44, borderRadius: 6, background: m.mediaUrl ? `url(${m.mediaUrl}) center/cover` : theme.color.purple }} />
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.caption}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted }}>{m.postedByName} · {m.source}</div>
            </div>
            <button onClick={() => moderate(m.id, "approved")} style={{ background: theme.color.successBg, color: theme.color.success, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>Approve</button>
            <button onClick={() => moderate(m.id, "rejected")} style={{ background: theme.color.dangerBg, color: theme.color.danger, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>Reject</button>
          </Card>
        ))}
        {pendingMoments.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Nothing waiting for review.</div>}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ textAlign: "center", padding: 16 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 26 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 2 }}>{label}</div>
    </Card>
  );
}
