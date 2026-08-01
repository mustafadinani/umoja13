import { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { theme } from "../lib/theme";

/**
 * In-app Stripe Payment Element via WebView (no native Stripe SDK rebuild required).
 * Posts { type: 'paid' } or { type: 'error', message } back to RN.
 */
export function StripePaymentForm({
  clientSecret,
  publishableKey,
  onPaid,
  onError,
}: {
  clientSecret: string;
  publishableKey: string;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const webRef = useRef<WebView>(null);

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
  <div id="status">Enter card details for the $35 Umoja Games review fee.</div>
  <div id="payment-element"></div>
  <div id="err"></div>
  <button id="pay" disabled>PAY $35</button>
  <script>
    const CLIENT_SECRET = ${JSON.stringify(clientSecret)};
    const PUBLISHABLE_KEY = ${JSON.stringify(publishableKey)};
    const stripe = Stripe(PUBLISHABLE_KEY);
    const elements = stripe.elements({ clientSecret: CLIENT_SECRET });
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');
    const payBtn = document.getElementById('pay');
    const errEl = document.getElementById('err');
    payBtn.disabled = false;
    function post(msg) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
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
  </script>
</body>
</html>`,
    [clientSecret, publishableKey]
  );

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type: string; message?: string };
      if (data.type === "paid") {
        setBusy(true);
        onPaid();
      } else if (data.type === "error") {
        onError(data.message ?? "Payment failed.");
      }
    } catch {
      onError("Unexpected payment response.");
    }
  }

  return (
    <View style={styles.wrap}>
      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.color.purple} />
          <Text style={{ marginTop: 8, color: theme.color.textMuted }}>Filing your case…</Text>
        </View>
      )}
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={onMessage}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
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
  overlay: { ...StyleSheet.absoluteFill, zIndex: 2, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
});
