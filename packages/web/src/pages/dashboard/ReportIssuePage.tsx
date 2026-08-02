import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "../../lib/theme";
import { createReportFeeIntent, filePaidReport } from "../../lib/callables";
import { useAuth } from "../../auth/AuthProvider";
import { PrimaryButton } from "../../components/ui";
import { StripePaymentForm } from "../../components/StripePaymentForm";

function callableMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

/** Full-page report + Stripe card form — same flow as mobile ComplaintScreen. */
export function ReportIssuePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);

  async function continueToPayment() {
    if (!profile || text.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const intent = await createReportFeeIntent({});
      setClientSecret(intent.data.clientSecret);
      setPublishableKey(intent.data.publishableKey);
      setPaymentIntentId(intent.data.paymentIntentId);
      setStep("pay");
    } catch (e) {
      setError(callableMessage(e, "Couldn't start payment."));
    } finally {
      setBusy(false);
    }
  }

  async function onCardPaid() {
    if (!profile || !paymentIntentId) return;
    setBusy(true);
    setError(null);
    try {
      const filed = await filePaidReport({
        text,
        filedByName: profile.displayName,
        filedByRole: profile.primaryRole,
        paymentIntentId,
        source: "fan_message",
      });
      setCaseNumber(filed.data.caseNumber);
      setConfirmationId(filed.data.stripeConfirmationId);
      setStep("done");
    } catch (e) {
      setError(callableMessage(e, "Payment succeeded but filing the case failed. Contact support with your payment receipt."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && caseNumber) {
    return (
      <div style={doneWrap}>
        <div style={{ fontSize: 40 }}>✓</div>
        <div style={titleStyle}>We've got it.</div>
        <div style={subStyle}>Case #{caseNumber} is with the Commissioner. Payment confirmed.</div>
        {confirmationId && <div style={{ ...subStyle, fontSize: 12, wordBreak: "break-all" }}>Stripe confirmation: {confirmationId}</div>}
        <PrimaryButton style={{ marginTop: 20, width: "100%" }} onClick={() => navigate("/dashboard")}>
          DONE
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button type="button" onClick={() => navigate("/dashboard")} style={backStyle}>
        ← Dashboard
      </button>
      <div style={titleStyle}>Report an issue</div>
      <div style={subStyle}>
        {step === "form"
          ? "Describe the issue, then continue to enter card details for the $35 review fee."
          : "Enter your card details below. Your case is filed only after payment succeeds."}
      </div>

      {step === "form" && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us what happened…"
            rows={5}
            style={textareaStyle}
          />
          {error && <div style={errorStyle}>{error}</div>}
          <PrimaryButton disabled={text.trim().length < 3 || busy} onClick={() => void continueToPayment()} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : "CONTINUE TO PAYMENT"}
          </PrimaryButton>
        </>
      )}

      {step === "pay" && clientSecret && publishableKey && (
        <>
          {error && <div style={errorStyle}>{error}</div>}
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaid={() => void onCardPaid()}
            onError={setError}
          />
          {busy && <div style={{ ...subStyle, marginTop: 12 }}>Filing your case…</div>}
        </>
      )}
    </div>
  );
}

const pageStyle = {
  maxWidth: 520,
  margin: "0 auto",
  padding: "28px 24px 48px",
} as const;

const doneWrap = {
  maxWidth: 520,
  margin: "0 auto",
  padding: "48px 24px",
  textAlign: "center" as const,
};

const titleStyle = {
  fontFamily: theme.font.display,
  fontWeight: 800,
  fontSize: 28,
  marginBottom: 8,
} as const;

const subStyle = {
  color: theme.color.textMuted,
  fontSize: 14,
  marginBottom: 18,
  lineHeight: 1.45,
} as const;

const textareaStyle = {
  width: "100%",
  padding: 12,
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.color.border}`,
  fontSize: 14,
  resize: "vertical" as const,
  marginBottom: 14,
  boxSizing: "border-box" as const,
  minHeight: 120,
};

const errorStyle = {
  color: theme.color.danger,
  fontSize: 13,
  marginBottom: 12,
} as const;

const backStyle = {
  background: "none",
  border: "none",
  color: theme.color.blue,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
  marginBottom: 16,
} as const;
