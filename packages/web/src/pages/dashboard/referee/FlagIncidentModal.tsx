import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { fileIncident } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export function FlagIncidentModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  async function submit() {
    if (!profile || text.trim().length < 5) return;
    setBusy(true);
    try {
      const res = await fileIncident({ source: "referee_flag", filedByName: profile.displayName, filedByRole: "referee", gameId, text });
      setCaseNumber(res.data.caseNumber);
    } finally {
      setBusy(false);
    }
  }

  if (caseNumber) {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Sent to the commissioner</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>Case #{caseNumber}</div>
          <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Flag an incident</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 12 }}>Explain what happened for the commissioner.</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 14 }}
      />
      <PrimaryButton disabled={text.trim().length < 5 || busy} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Sending…" : "SEND TO COMMISSIONER"}
      </PrimaryButton>
    </Modal>
  );
}
