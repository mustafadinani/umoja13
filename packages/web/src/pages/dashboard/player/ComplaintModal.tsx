import { useState } from "react";
import type { ComplaintType } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { fileIncident, createComplaintCheckout } from "../../../lib/callables";
import { useAuth } from "../../../auth/AuthProvider";
import { Modal, PrimaryButton, Pill } from "../../../components/ui";

const TYPES: { id: ComplaintType; label: string }[] = [
  { id: "ineligible_player", label: "Ineligible Player" },
  { id: "game_related", label: "Game Related" },
  { id: "other", label: "Other" },
];

export function ComplaintModal({ teamName, onClose }: { teamName: string; onClose: () => void }) {
  const { profile } = useAuth();
  const [type, setType] = useState<ComplaintType | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!type || text.trim().length < 3 || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const filed = await fileIncident({
        source: "captain_complaint",
        filedByName: profile.displayName,
        filedByRole: `captain, ${teamName}`,
        complaintType: type,
        text,
      });
      setCaseNumber(filed.data.caseNumber);
      try {
        const checkout = await createComplaintCheckout({
          incidentId: filed.data.id,
          successUrl: `${window.location.origin}/dashboard?complaintPaid=1&incidentId=${filed.data.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/dashboard`,
        });
        setCheckoutUrl(checkout.data.checkoutUrl);
      } catch (checkoutErr) {
        // The case is already filed at this point — don't lose that. Surface the
        // payment failure separately so the captain isn't left wondering why
        // there's no pay button.
        setCheckoutError(checkoutErr instanceof Error ? checkoutErr.message : "Couldn't start the $35 payment.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't file your complaint.");
    } finally {
      setBusy(false);
    }
  }

  if (caseNumber) {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>We've got it.</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            Case #{caseNumber} is with the Commissioner. $35 review fee is refunded if the complaint is upheld.
          </div>
          {checkoutUrl && (
            <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={() => window.location.assign(checkoutUrl)}>
              PAY $35 & SUBMIT
            </PrimaryButton>
          )}
          {checkoutError && (
            <div style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 14 }}>
              Case filed, but the $35 payment step couldn't start ({checkoutError}). The Commissioner has your case number — contact them if you're not prompted to pay.
            </div>
          )}
          <button onClick={onClose} style={{ marginTop: 10, background: "none", border: "none", color: theme.color.textMuted, fontSize: 13 }}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>File a complaint</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 14 }}>This goes straight to the Commissioner.</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {TYPES.map((t) => (
          <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.label}</Pill>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell us what happened…"
        rows={4}
        style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 12 }}
      />
      <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 14 }}>
        A $35 review fee applies, refunded if the complaint is upheld.
      </div>
      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <PrimaryButton disabled={!type || text.trim().length < 3 || busy} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Filing…" : "CONTINUE TO $35 FEE"}
      </PrimaryButton>
    </Modal>
  );
}
