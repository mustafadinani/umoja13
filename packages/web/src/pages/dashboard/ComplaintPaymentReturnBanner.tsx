import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { theme } from "../../lib/theme";
import { confirmIncidentPayment } from "../../lib/callables";

/**
 * After Stripe Checkout redirects back with session_id + incidentId, confirm
 * payment and write stripeConfirmationId onto the incident.
 */
export function ComplaintPaymentReturnBanner() {
  const [params, setParams] = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    const sessionId = params.get("session_id");
    const incidentId = params.get("incidentId");
    const paidFlag = params.get("complaintPaid");
    if (!paidFlag || !sessionId || !incidentId || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await confirmIncidentPayment({ incidentId, sessionId });
        setMessage(
          res.data.alreadyRecorded
            ? `Payment already recorded. Confirmation: ${res.data.stripeConfirmationId}`
            : `Payment confirmed. Stripe confirmation: ${res.data.stripeConfirmationId}`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't confirm payment.");
      } finally {
        const next = new URLSearchParams(params);
        next.delete("complaintPaid");
        next.delete("session_id");
        next.delete("incidentId");
        setParams(next, { replace: true });
      }
    })();
  }, [params, setParams]);

  if (!message && !error) return null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 24px 0" }}>
      <div
        style={{
          background: error ? theme.color.dangerBg : theme.color.successBg,
          color: error ? theme.color.danger : theme.color.success,
          borderRadius: theme.radius.sm,
          padding: "12px 14px",
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        {error ?? message}
      </div>
    </div>
  );
}
