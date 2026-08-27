import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { createSponsorshipIntent, confirmSponsorshipPayment } from "../lib/callables";
import { StripePaymentForm } from "./StripePaymentForm";

// Matches Feedback.tsx's own "we already have this" chip (page 4's help-
// contact fields) — same confirmation, not a second free-text ask.
const alreadyHaveStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  color: theme.color.success,
  background: theme.color.successBg,
  borderRadius: theme.radius.sm,
  padding: "10px 14px",
  marginBottom: 10,
};

const QUICK_AMOUNTS = [25, 50, 100];
const DEFAULT_AMOUNT = 100;
// How long to wait after the last edit before quietly loading the card form
// for whatever amount/name/email are currently entered — long enough that a
// few keystrokes in a row don't each fire their own PaymentIntent, short
// enough that it still feels automatic rather than like a "Next" click.
const INTENT_DEBOUNCE_MS = 800;

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
 * "Grab their donation right on the next page" — the survey's own donate
 * step, laid out inline like every other page of /feedback (not a popup
 * over the survey). Reuses the exact same backend as the full Become a
 * Sponsor checkout (createSponsorshipIntent under the "custom" tier +
 * confirmSponsorshipPayment) and the same embedded Stripe Payment Element
 * (StripePaymentForm) — just without any of the sponsor-branding fields
 * (donor type, logo, website/social links) that don't belong in a quick
 * post-tournament ask. A completed donation is still a real SponsorshipOrder,
 * so it shows up in the existing sponsorship admin queue exactly like any
 * other donation, with nothing new to maintain there.
 *
 * One screen, not a wizard: amount, name/email, and the card form all sit
 * here together. The card form loads itself in place a beat after amount/
 * name/email are filled in (see INTENT_DEBOUNCE_MS) instead of behind a
 * "Continue" tap. The caller (Feedback.tsx) submits the whole survey and
 * jumps to the Thank You step the instant onDonated fires — donating IS
 * finishing the survey, no separate "thanks for the gift" screen needed.
 */
export function DonateStep({
  onDonated,
  initialName = "",
  initialEmail = "",
}: {
  /** Fired the moment payment is confirmed — caller submits the survey with donatedOrderId attached and moves on. */
  onDonated: (info: { orderId: string; amountCents: number }) => void;
  /** Whatever the caller already has on hand (e.g. page 2 of the survey) — still fully editable, just saves a guest from retyping it. */
  initialName?: string;
  initialEmail?: string;
}) {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [usingCustom, setUsingCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState(profile?.displayName || initialName);
  const [email, setEmail] = useState(user?.email || profile?.email || initialEmail);
  // Fixed at mount, not recomputed as donorName/email change below — this is
  // "did we already know this about them" (account or an earlier page of
  // the survey), so already-answered fields show as a confirmation instead
  // of asking a second time for something they just told us.
  const [nameProvided] = useState(() => !!donorName.trim());
  const [emailProvided] = useState(() => !!email.trim());

  const [loadingCard, setLoadingCard] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidAmountCents, setPaidAmountCents] = useState<number | null>(null);
  // Which "amount|name|email" combo the loaded clientSecret actually belongs
  // to — lets a later edit invalidate a stale card form instead of letting
  // someone confirm a $25 PaymentIntent while the button now says $100.
  const readyKeyRef = useRef<string | null>(null);

  const amountCents = Math.round((usingCustom ? parseFloat(customAmount || "0") : amount) * 100);
  const validAmount = amountCents >= 100;
  const currentKey = `${amountCents}|${donorName.trim()}|${email.trim()}`;
  const cardReady = validAmount && !!donorName.trim() && !!email.trim() && readyKeyRef.current === currentKey && !!clientSecret && !!publishableKey;

  useEffect(() => {
    if (!validAmount || !donorName.trim() || !email.trim()) return;
    if (readyKeyRef.current === currentKey) return;
    const key = currentKey;
    const handle = setTimeout(() => {
      setLoadingCard(true);
      setError(null);
      createSponsorshipIntent({
        tierId: "custom",
        donorType: "individual",
        donorName: donorName.trim(),
        email: email.trim(),
        customAmountCents: amountCents,
      })
        .then((intent) => {
          readyKeyRef.current = key;
          setClientSecret(intent.data.clientSecret);
          setPublishableKey(intent.data.publishableKey);
          setPaymentIntentId(intent.data.paymentIntentId);
          setOrderId(intent.data.orderId);
          setPaidAmountCents(intent.data.amountCents);
        })
        .catch((e) => setError(callableMessage(e, "Couldn't load the card form.")))
        .finally(() => setLoadingCard(false));
    }, INTENT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountCents, donorName, email, validAmount]);

  async function onCardPaid() {
    if (!orderId || !paymentIntentId) return;
    setConfirming(true);
    setError(null);
    try {
      await confirmSponsorshipPayment({ orderId, paymentIntentId });
      onDonated({ orderId, amountCents: paidAmountCents ?? amountCents });
    } catch (e) {
      setError(callableMessage(e, "Payment succeeded but confirming it failed. Contact us with your payment receipt."));
      setConfirming(false);
    }
  }

  return (
    <div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, fontStyle: "italic", marginBottom: 20 }}>
        Goes straight to Umoja 14 — same secure checkout as umoja13.com/donate.
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Choose an amount</div>
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

      {nameProvided ? (
        <div style={alreadyHaveStyle}>
          <span>✓ Name</span>
          <span style={{ marginLeft: "auto", fontWeight: 700, color: theme.color.text }}>{donorName}</span>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Full name<span style={{ color: theme.color.pink, marginLeft: 3 }}>*</span></div>
          <input
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
          />
        </>
      )}
      {emailProvided ? (
        <div style={{ ...alreadyHaveStyle, marginBottom: 16 }}>
          <span>✓ Email</span>
          <span style={{ marginLeft: "auto", fontWeight: 700, color: theme.color.text }}>{email}</span>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Email<span style={{ color: theme.color.pink, marginLeft: 3 }}>*</span></div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16, fontSize: 13.5 }}
          />
        </>
      )}

      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}

      {cardReady ? (
        <>
          <StripePaymentForm
            key={clientSecret}
            clientSecret={clientSecret!}
            publishableKey={publishableKey!}
            onPaid={() => void onCardPaid()}
            onError={setError}
            statusText={`Enter card details for your ${formatDollars(paidAmountCents ?? amountCents)} donation.`}
            payLabel={`DONATE ${formatDollars(paidAmountCents ?? amountCents)}`}
          />
          {confirming && <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 12 }}>Confirming your donation…</div>}
        </>
      ) : (
        <div
          style={{
            borderRadius: 10, border: `1px dashed ${theme.color.border}`, background: theme.color.bg,
            padding: "16px 14px", textAlign: "center", color: theme.color.textMuted, fontSize: 13,
          }}
        >
          {loadingCard ? "Loading the secure card form…" : "Enter your name and email above to load the secure card form."}
        </div>
      )}
    </div>
  );
}
