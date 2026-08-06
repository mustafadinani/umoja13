import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useAllMoments, useGames, useIncidents, useTeams } from "../../../hooks/useData";
import { postAnnouncement as postAnnouncementCallable } from "../../../lib/callables";
import { Card, PrimaryButton } from "../../../components/ui";

export function ModerationOpsTab() {
  const { data: moments } = useAllMoments();
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const { data: incidents } = useIncidents();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [alsoNotify, setAlsoNotify] = useState(false);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<{ notifiedCount: number; pushCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingMoments = moments.filter((m) => m.moderationStatus === "pending");
  const checkedInPct = teams.length
    ? Math.round((teams.flatMap((t) => t.roster).filter((p) => p.checkInStatus === "approved").length / Math.max(1, teams.flatMap((t) => t.roster).length)) * 100)
    : 0;
  const openIncidents = incidents.filter((i) => i.status === "submitted" || i.status === "under_review").length;

  async function moderate(momentId: string, status: "approved" | "rejected") {
    await updateDoc(doc(db, COLLECTIONS.moments, momentId), { moderationStatus: status });
  }

  async function postAnnouncement() {
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    setError(null);
    setResult(null);
    try {
      const res = await postAnnouncementCallable({ title, body, alsoNotify });
      setResult({ notifiedCount: res.data.notifiedCount, pushCount: res.data.pushCount });
      setTitle("");
      setBody("");
      setAlsoNotify(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post this announcement.");
    } finally {
      setPosting(false);
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

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MODERATION QUEUE</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
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

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>POST AN ANNOUNCEMENT</div>
      <Card>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13.5 }}
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5, resize: "none" }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={alsoNotify} onChange={(e) => setAlsoNotify(e.target.checked)} />
          Also send as a notification to everyone
        </label>
        {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {result && (
          <div style={{ color: theme.color.success, fontSize: 13, marginBottom: 10 }}>
            Posted{result.notifiedCount > 0 ? ` and notified ${result.notifiedCount} ${result.notifiedCount === 1 ? "person" : "people"} (${result.pushCount} got a push)` : ""}.
          </div>
        )}
        <PrimaryButton disabled={posting || !title.trim() || !body.trim()} onClick={postAnnouncement}>{posting ? "Posting…" : "POST"}</PrimaryButton>
      </Card>
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
