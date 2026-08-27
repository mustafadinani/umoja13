import { useEffect, useRef, useState, type CSSProperties } from "react";
import { theme } from "../lib/theme";

type StripeElements = {
  create: (type: "payment") => {
    mount: (el: string | HTMLElement) => void;
    unmount: () => void;
  };
};

type StripeInstance = {
  elements: (opts: { clientSecret: string }) => StripeElements;
  confirmPayment: (opts: {
    elements: StripeElements;
    redirect: "if_required";
  }) => Promise<{
    error?: { message?: string };
    paymentIntent?: { id?: string; status?: string };
  }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeInstance;
  }
}

let stripeJsPromise: Promise<void> | null = null;

function loadStripeJs() {
  if (window.Stripe) return Promise.resolve();
  if (stripeJsPromise) return stripeJsPromise;
  stripeJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Stripe.js"));
    document.head.appendChild(script);
  });
  return stripeJsPromise;
}

/**
 * Same Stripe Payment Element flow as mobile (js.stripe.com/v3 + elements.create('payment')).
 */
export function StripePaymentForm({
  clientSecret,
  publishableKey,
  onPaid,
  onError,
  statusText = "Enter card details for the $35 Umoja Games review fee.",
  payLabel = "PAY $35",
}: {
  clientSecret: string;
  publishableKey: string;
  onPaid: () => void;
  onError: (message: string) => void;
  /** Defaults preserve the original $35 report-fee copy — pass real values for any other amount (e.g. sponsorship). */
  statusText?: string;
  payLabel?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const paidRef = useRef(false);
  const apiRef = useRef<{ stripe: StripeInstance; elements: StripeElements } | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let paymentElement: { mount: (el: HTMLElement) => void; unmount: () => void } | null = null;

    (async () => {
      try {
        await loadStripeJs();
        if (cancelled || !mountRef.current || !window.Stripe) return;
        const stripe = window.Stripe(publishableKey);
        const elements = stripe.elements({ clientSecret });
        paymentElement = elements.create("payment");
        paymentElement.mount(mountRef.current);
        apiRef.current = { stripe, elements };
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) onErrorRef.current(e instanceof Error ? e.message : "Couldn't load card form.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        paymentElement?.unmount();
      } catch {
        /* ignore */
      }
      apiRef.current = null;
    };
  }, [clientSecret, publishableKey]);

  async function pay() {
    const api = apiRef.current;
    if (!api || busy || paidRef.current) return;
    setBusy(true);
    onError("");
    try {
      const { error, paymentIntent } = await api.stripe.confirmPayment({
        elements: api.elements,
        redirect: "if_required",
      });
      if (error) {
        onError(error.message || "Payment failed.");
        setBusy(false);
        return;
      }
      if (paymentIntent && paymentIntent.status !== "succeeded") {
        onError(`Payment status: ${paymentIntent.status}`);
        setBusy(false);
        return;
      }
      paidRef.current = true;
      onPaid();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Payment failed.");
      setBusy(false);
    }
  }

  return (
    <div style={wrapStyle}>
      <div style={statusStyle}>{statusText}</div>
      <div ref={mountRef} style={{ minHeight: 200 }} />
      {!ready && <div style={statusStyle}>Loading card form…</div>}
      <button type="button" disabled={!ready || busy} onClick={() => void pay()} style={payBtnStyle(!ready || busy)}>
        {busy ? "Processing…" : payLabel}
      </button>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${theme.color.border}`,
  background: "#fff",
  padding: 12,
};

const statusStyle: CSSProperties = {
  color: theme.color.textMuted,
  fontSize: 13,
  marginBottom: 10,
};

function payBtnStyle(disabled: boolean): CSSProperties {
  return {
    marginTop: 16,
    width: "100%",
    padding: 14,
    border: "none",
    borderRadius: 10,
    background: theme.color.navy,
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
