import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { theme } from "../lib/theme";

// Gives the raw HTML string a real https origin instead of the null/"about:blank"
// origin WKWebView otherwise assigns `source={{ html }}` on iOS. Stripe.js mounts
// the Payment Element in a cross-origin iframe and relies on being embedded in a
// page with a genuine origin for its own storage/postMessage setup — without
// this, the element can silently fail to finish mounting on iOS specifically,
// which is exactly what "stuck on a blank/loading payment screen" looks like
// from the user's side, with no error ever surfacing.
const WEBVIEW_BASE_URL = "https://umoja-games-proto.web.app";

const READY_TIMEOUT_MS = 15000;

/**
 * In-app Stripe Payment Element via WebView (no native Stripe SDK rebuild required).
 * Posts { type: 'paid' }, { type: 'error', message }, or { type: 'ready' } back to RN.
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
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = false;
    setTimedOut(false);
    const timer = setTimeout(() => {
      if (!readyRef.current) setTimedOut(true);
    }, READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [reloadKey, clientSecret]);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 12px; background: #fff; color: #211A33; }
    #pay { margin-top: 16px; width: 100%; padding: 14px; border: none; border-radius: 10px; background: #211A33; color: #fff; font-weight: 800; font-size: 16px; }
    #pay:disabled { opacity: 0.5; }
    #err { color: #C0392B; font-size: 13px; margin-top: 10px; min-height: 18px; }
    #status { color: #6F6981; font-size: 13px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div id="status">${statusText.replace(/</g, "&lt;")}</div>
  <div id="payment-element"></div>
  <div id="err"></div>
  <button id="pay" disabled>${payLabel.replace(/</g, "&lt;")}</button>
  <script>
    function post(msg) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
    // Any uncaught error/rejection used to leave the button silently
    // disabled forever with nothing reported back to the app — the classic
    // "stuck" symptom. Surface everything instead.
    window.onerror = function (message) { post({ type: 'error', message: 'Payment form error: ' + message }); return true; };
    window.onunhandledrejection = function (event) {
      var reason = event && event.reason;
      post({ type: 'error', message: 'Payment form error: ' + ((reason && reason.message) || String(reason)) });
    };

    const CLIENT_SECRET = ${JSON.stringify(clientSecret)};
    const PUBLISHABLE_KEY = ${JSON.stringify(publishableKey)};
    const payBtn = document.getElementById('pay');
    const errEl = document.getElementById('err');

    if (typeof Stripe !== 'function') {
      post({ type: 'error', message: 'Payment form failed to load Stripe.js — check your connection and try again.' });
    } else {
      const stripe = Stripe(PUBLISHABLE_KEY);
      const elements = stripe.elements({ clientSecret: CLIENT_SECRET });
      const paymentElement = elements.create('payment');
      paymentElement.on('ready', function () { payBtn.disabled = false; post({ type: 'ready' }); });
      paymentElement.on('loaderror', function (e) {
        post({ type: 'error', message: (e && e.error && e.error.message) || 'Payment form failed to load.' });
      });
      paymentElement.mount('#payment-element');

      payBtn.addEventListener('click', async () => {
        payBtn.disabled = true;
        errEl.textContent = '';
        try {
          const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
          });
          if (error) {
            errEl.textContent = error.message || 'Payment failed.';
            post({ type: 'error', message: error.message || 'Payment failed.' });
            payBtn.disabled = false;
            return;
          }
          if (paymentIntent && paymentIntent.status !== 'succeeded') {
            const m = 'Payment status: ' + paymentIntent.status;
            errEl.textContent = m;
            post({ type: 'error', message: m });
            payBtn.disabled = false;
            return;
          }
          post({ type: 'paid', paymentIntentId: paymentIntent && paymentIntent.id });
        } catch (e) {
          const m = (e && e.message) || 'Payment failed.';
          errEl.textContent = m;
          post({ type: 'error', message: m });
          payBtn.disabled = false;
        }
      });
    }
  </script>
</body>
</html>`,
    [clientSecret, publishableKey, statusText, payLabel]
  );

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type: string; message?: string };
      if (data.type === "ready") {
        readyRef.current = true;
        setTimedOut(false);
      } else if (data.type === "paid") {
        setBusy(true);
        onPaid();
      } else if (data.type === "error") {
        onError(data.message ?? "Payment failed.");
      }
    } catch {
      onError("Unexpected payment response.");
    }
  }

  function retry() {
    setTimedOut(false);
    setReloadKey((k) => k + 1);
  }

  return (
    <View style={styles.wrap}>
      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.color.purple} />
          <Text style={{ marginTop: 8, color: theme.color.textMuted }}>Filing your case…</Text>
        </View>
      )}
      {timedOut && !busy && (
        <View style={styles.overlay}>
          <Text style={{ color: theme.color.text, fontWeight: "700", fontSize: 14, textAlign: "center", paddingHorizontal: 20 }}>
            The payment form is taking longer than expected.
          </Text>
          <Text style={{ marginTop: 6, color: theme.color.textMuted, fontSize: 12.5, textAlign: "center", paddingHorizontal: 20 }}>
            Check your connection, then try again.
          </Text>
          <TouchableOpacity onPress={retry} style={styles.retryBtn}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13.5 }}>RETRY</Text>
          </TouchableOpacity>
        </View>
      )}
      <WebView
        key={reloadKey}
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html, baseUrl: WEBVIEW_BASE_URL }}
        onMessage={onMessage}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        startInLoadingState
        onError={(e) => onError(`Couldn't load the payment form: ${e.nativeEvent.description}`)}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.color.purple} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 360, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
  web: { flex: 1, backgroundColor: "#fff" },
  loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 2, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  retryBtn: { marginTop: 14, backgroundColor: theme.color.purple, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24 },
});
