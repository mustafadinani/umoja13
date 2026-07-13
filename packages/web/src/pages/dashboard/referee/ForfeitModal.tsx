import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type ForfeitOutcome } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { fileIncident } from "../../../lib/callables";
import { Modal, PrimaryButton, Pill } from "../../../components/ui";

const OUTCOMES: { id: ForfeitOutcome; label: string }[] = [
  { id: "home_win", label: "Home team wins 5–0" },
  { id: "away_win", label: "Away team wins 5–0" },
  { id: "double_no_show", label: "Double no-show (0–0, no points)" },
];

export function ForfeitModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [outcome, setOutcome] = useState<ForfeitOutcome | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!outcome || !user || !profile) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.games, gameId), {
        forfeit: { outcome, reason: note, declaredBy: user.uid, declaredAt: Date.now() },
        status: "forfeited",
        updatedAt: Date.now(),
      });
      await fileIncident({
        source: "forfeit",
        filedByName: profile.displayName,
        filedByRole: "referee",
        gameId,
        text: note || `Forfeit declared: ${outcome}`,
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>🚩</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Forfeit recorded</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            The commissioner has been notified. This decision is final on the field.
          </div>
          <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Declare Forfeit / No-Show</div>

      <div style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 14, fontSize: 12, color: theme.color.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
        <strong>FORFEITS &amp; NO-SHOWS.</strong> Teams must be ready to play at their scheduled match time. A maximum
        5-minute grace period is allowed. Minimum players to start: 9-aside 6 · 7-aside 5 · 5-aside 3. If a team
        doesn't meet the minimum after the grace period, declare a forfeit: the present/eligible team wins 5–0, the
        other team takes a 0–5 loss. The match is not rescheduled. If <strong>both</strong> teams fail to meet the
        minimum, it's a <strong>Double No-Show</strong>: recorded 0–0, zero points either side, no GF/GA, and neither
        team advances in knockout stages. Referees will not negotiate or extend the grace period. All forfeit/no-show
        decisions made on the field are final and may only be reviewed for disciplinary reasons, not to change the
        match outcome.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {OUTCOMES.map((o) => (
          <Pill key={o.id} active={outcome === o.id} onClick={() => setOutcome(o.id)}>{o.label}</Pill>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g. only 4 players present at 10:45)…"
        rows={3}
        style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 14 }}
      />

      <PrimaryButton disabled={!outcome || busy} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Recording…" : "CONFIRM FORFEIT"}
      </PrimaryButton>
    </Modal>
  );
}
