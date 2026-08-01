import { useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { createReportFeeIntent, filePaidReport } from "../lib/callables";
import { PrimaryButton } from "../components/ui";
import { StripePaymentForm } from "../components/StripePaymentForm";

function callableMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

export function ComplaintScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Complaint">) {
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
      <View style={styles.doneWrap}>
        <Text style={{ fontSize: 40 }}>✓</Text>
        <Text style={styles.h1}>We've got it.</Text>
        <Text style={styles.sub}>Case #{caseNumber} is with the Commissioner. Payment confirmed.</Text>
        {confirmationId && <Text style={styles.conf}>Stripe confirmation: {confirmationId}</Text>}
        <PrimaryButton onPress={() => navigation.goBack()} style={{ marginTop: 20, width: "100%" }}>
          DONE
        </PrimaryButton>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Report an issue</Text>
      <Text style={styles.sub}>
        {step === "form"
          ? "Describe the issue, then continue to enter card details for the $35 review fee."
          : "Enter your card details below. Your case is filed only after payment succeeds."}
      </Text>

      {step === "form" && (
        <>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Tell us what happened…"
            multiline
            numberOfLines={5}
            style={styles.textarea}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton disabled={text.trim().length < 3 || busy} onPress={continueToPayment} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : "CONTINUE TO PAYMENT"}
          </PrimaryButton>
        </>
      )}

      {step === "pay" && clientSecret && publishableKey && (
        <>
          {error && <Text style={styles.error}>{error}</Text>}
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaid={onCardPaid}
            onError={setError}
          />
          {busy && <Text style={[styles.sub, { marginTop: 12 }]}>Filing your case…</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontWeight: "800", fontSize: 20, marginBottom: 6, textAlign: "center" },
  sub: { color: theme.color.textMuted, fontSize: 13, marginBottom: 14, textAlign: "center" },
  conf: { color: theme.color.textMuted, fontSize: 11, marginTop: 8, textAlign: "center" },
  textarea: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 13.5,
    minHeight: 110,
    textAlignVertical: "top",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  error: { color: theme.color.danger, fontSize: 13, marginBottom: 10, textAlign: "center" },
  doneWrap: { flex: 1, backgroundColor: theme.color.bg, alignItems: "center", justifyContent: "center", padding: 30 },
});
