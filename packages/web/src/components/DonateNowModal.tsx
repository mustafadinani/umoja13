import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { createSponsorshipIntent, confirmSponsorshipPayment } from "../lib/callables";
import { Modal, PrimaryButton } from "./ui";
import { StripePaymentForm } from "./StripePaymentForm";

const QUICK_AMOUNTS = [25, 50, 100];
const DEFAULT_AMOUNT = 100;

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

function callableMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

/**
 * Lean "donate right now" flow launched from the Feedback survey's "Make a
 * donation today" option. Reuses the exact same backend as the full Become a
 * Sponsor checkout (createSponsorshipIntent under the "custom" tier +
 * confirmSponsorshipPayment) and the same embedded Stripe Payment Element
 * (StripePaymentForm) — just without any of the sponsor-branding fields
 * (donor type, logo, website/social links) that don't belong in a quick
 * post-tournament ask. A completed donation is still a real SponsorshipOrder,
 * so it shows up in the existing sponsorship admin queue exactly like any
 * other donation, with nothing new to maintain there.
 */
export function DonateNowModal({
  onClose,
  onDonated,
}: {
  onClose: () => void;
  /** Fired the moment payment is confirmed — caller uses this to record donatedOrderId on the feedback response. */
  onDonated: (info: { orderId: string; amountCents: number }) => void;
}) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<"amount" | "pay" | "done">("amount");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [usingCustom, setUsingCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? profile?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidAmountCents, setPaidAmountCents] = useState<number | null>(null);

  const amountCents = Math.round((usingCustom ? parseFloat(customAmount || "0") : amount) * 100);
  const validAmount = amountCents >= 100;
  const canSubmit = validAmount && !!donorName.trim() && !!email.trim();

  async function continueToPayment() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const intent = await createSponsorshipIntent({
        tierId: "custom",
        donorType: "individual",
        donorName: donorName.trim(),
        email: email.trim(),
        customAmountCents: amountCents,
      });
      setClientSecret(intent.data.clientSecret);
      setPublishableKey(intent.data.publishableKey);
      setPaymentIntentId(intent.data.paymentIntentId);
      setOrderId(intent.data.orderId);
      setPaidAmountCents(intent.data.amountCents);
      setStep("pay");
    } catch (e) {
      setError(callableMessage(e, "Couldn't start payment."));
    } finally {
      setBusy(false);
    }
  }

  async function onCardPaid() {
    if (!orderId || !paymentIntentId) return;
    setBusy(true);
    setError(null);
    try {
      await confirmSponsorshipPayment({ orderId, paymentIntentId });
      setStep("done");
      onDonated({ orderId, amountCents: paidAmountCents ?? amountCents });
    } catch (e) {
      setError(callableMessage(e, "Payment succeeded but confirming it failed. Contact us with your payment receipt."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <Modal onClose={onClose} width={420}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginTop: 8 }}>Thank you for your gift!</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 8, lineHeight: 1.45 }}>
            Your {formatDollars(paidAmountCents ?? amountCents)} donation goes straight to Umoja 14 — a receipt is on its way to your email.
          </div>
          <PrimaryButton style={{ marginTop: 20, width: "100%" }} onClick={onClose}>Continue →</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Make a Donation</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 18 }}>
        Goes straight to Umoja 14 — same secure checkout as umoja13.com/donate.
      </div>

      {step === "pay" && clientSecret && publishableKey ? (
        <>
          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaid={() => void onCardPaid()}
            onError={setError}
            statusText={`Enter card details for your ${formatDollars(paidAmountCents ?? amountCents)} donation.`}
            payLabel={`DONATE ${formatDollars(paidAmountCents ?? amountCents)}`}
          />
          {busy && <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 12 }}>Confirming your donation…</div>}
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Choose an amount</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {QUICK_AMOUNTS.map((a) => {
              const active = !usingCustom && amount === a;
              return (
                <button
                  key={a}
                  onClick={() => { setUsingCustom(false); setAmount(a); }}
                  style={{
                    padding: "9px 18px", borderRadius: theme.radius.pill, fontWeight: 800, fontSize: 13.5, cursor: "pointer",
                    border: `1.5px solid ${active ? theme.color.navy : theme.color.border}`,
                    background: active ? theme.color.navy : "#fff",
                    color: active ? "#fff" : theme.color.text,
                  }}
                >
                  ${a}
                </button>
              );
            })}
            <button
              onClick={() => setUsingCustom(true)}
              style={{
                padding: "9px 18px", borderRadius: theme.radius.pill, fontWeight: 800, fontSize: 13.5, cursor: "pointer",
                border: `1.5px solid ${usingCustom ? theme.color.navy : theme.color.border}`,
                background: usingCustom ? theme.color.navy : "#fff",
                color: usingCustom ? "#fff" : theme.color.text,
              }}
            >
              Other amount
            </button>
          </div>
          {usingCustom && (
            <input
              type="number"
              min={1}
              autoFocus
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="e.g. 250"
              style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 14, fontSize: 13.5 }}
            />
          )}

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Full name</div>
          <input
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
          />
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16, fontSize: 13.5 }}
          />

          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <PrimaryButton disabled={!canSubmit || busy} onClick={() => void continueToPayment()} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : `DONATE ${formatDollars(Math.max(amountCents, 100))} →`}
          </PrimaryButton>
        </>
      )}
    </Modal>
  );
}
