import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { theme } from "../../lib/theme";
import { createReportFeeIntent, filePaidReport } from "../../lib/callables";
import { useAuth } from "../../auth/AuthProvider";
import { Modal, PrimaryButton } from "../../components/ui";

function callableMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

function PayForm({
  paymentIntentId,
  text,
  onPaid,
  onError,
}: {
  paymentIntentId: string;
  text: string;
  onPaid: (caseNumber: string, confirmationId: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements || !profile) return;
    setBusy(true);
    onError("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        onError(error.message ?? "Payment failed.");
        return;
      }
      const piId = paymentIntent?.id ?? paymentIntentId;
      if (paymentIntent && paymentIntent.status !== "succeeded") {
        onError(`Payment status: ${paymentIntent.status}`);
        return;
      }
      const filed = await filePaidReport({
        text,
        filedByName: profile.displayName,
        filedByRole: profile.primaryRole,
        paymentIntentId: piId,
        source: "fan_message",
      });
      onPaid(filed.data.caseNumber, filed.data.stripeConfirmationId);
    } catch (e) {
      onError(callableMessage(e, "Couldn't complete payment."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PaymentElement options={{ layout: "tabs" }} />
      <PrimaryButton disabled={!stripe || busy} onClick={pay} style={{ width: "100%", marginTop: 16 }}>
        {busy ? "Processing…" : "PAY $35"}
      </PrimaryButton>
    </div>
  );
}

/** Fan / any-role: report to commissioner with in-app $35 Stripe Payment Element. */
export function ReportIssueModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);

  async function continueToPayment() {
    if (text.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const intent = await createReportFeeIntent({});
      setClientSecret(intent.data.clientSecret);
      setPaymentIntentId(intent.data.paymentIntentId);
      setStripePromise(loadStripe(intent.data.publishableKey));
      setStep("pay");
    } catch (e) {
      setError(callableMessage(e, "Couldn't start payment."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && caseNumber) {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>We've got it.</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            Case #{caseNumber} is with the Commissioner. Payment confirmed.
          </div>
          {confirmationId && (
            <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 8, wordBreak: "break-all" }}>
              Stripe confirmation: {confirmationId}
            </div>
          )}
          <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Report an issue</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 14 }}>
        {step === "form"
          ? "Describe the issue, then continue to enter card details for the $35 review fee."
          : "Enter your card details. Your case is filed only after payment succeeds."}
      </div>

      {step === "form" && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us what happened…"
            rows={5}
            style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 12 }}
          />
          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <PrimaryButton disabled={text.trim().length < 3 || busy} onClick={continueToPayment} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : "CONTINUE TO PAYMENT"}
          </PrimaryButton>
        </>
      )}

      {step === "pay" && clientSecret && stripePromise && paymentIntentId && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <PayForm
            paymentIntentId={paymentIntentId}
            text={text}
            onPaid={(cn, conf) => {
              setCaseNumber(cn);
              setConfirmationId(conf);
              setStep("done");
            }}
            onError={setError}
          />
        </Elements>
      )}
    </Modal>
  );
}
