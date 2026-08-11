import { useState } from "react";
import { View, Text, TextInput, Image, StyleSheet, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CUSTOM_TIER_SUGGESTED_CENTS, SPONSORSHIP_TIERS, type SponsorTier, type SponsorshipDonorType } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { createSponsorshipIntent, confirmSponsorshipPayment } from "../lib/callables";
import { uploadPickedPhoto } from "../lib/uploadPhoto";
import { Modal, PrimaryButton, Pill } from "./ui";
import { StripePaymentForm } from "./StripePaymentForm";
import { SponsorInquiryModal } from "./SponsorInquiryModal";

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

function callableMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

export function SponsorshipCheckoutModal({ onClose, initialTierId }: { onClose: () => void; initialTierId?: SponsorTier }) {
  const { user, profile } = useAuth();
  const [showInquiry, setShowInquiry] = useState(false);
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [tierId, setTierId] = useState<SponsorTier | null>(initialTierId ?? null);
  const [donorType, setDonorType] = useState<SponsorshipDonorType>("individual");
  const [donorName, setDonorName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  // A blank field reads as "I don't know what to give" — a concrete
  // starting point they can raise or lower gets people moving instead of
  // staring at an empty box, and it's clearly editable (not a fixed price).
  const [customAmount, setCustomAmount] = useState(String(CUSTOM_TIER_SUGGESTED_CENTS / 100));
  const [customNote, setCustomNote] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidAmountCents, setPaidAmountCents] = useState<number | null>(null);

  if (showInquiry) return <SponsorInquiryModal onClose={onClose} />;

  const tier = SPONSORSHIP_TIERS.find((t) => t.id === tierId) ?? null;
  const customAmountCents = Math.round(parseFloat(customAmount || "0") * 100);
  const validCustomAmount = tier?.priceCents == null ? customAmountCents >= 100 : true;
  const canSubmit = !!tier && !!donorName.trim() && !!email.trim() && validCustomAmount;

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    // Ask iOS for the "compatible" asset representation (real JPEG, not
    // whatever the photo library actually stores it as) — a photo library
    // pick, unlike a fresh capture, is HEIC on iOS far more often than not.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (!result.canceled && result.assets[0]) setLogoUri(result.assets[0].uri);
  }

  // Same embedded Stripe Payment Element pattern as Report to Commissioner
  // (createReportFeeIntent + StripePaymentForm) — no more bouncing the
  // donor out to their phone's browser to finish checkout.
  async function continueToPayment() {
    if (!tier || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      let companyLogoUrl: string | undefined;
      if (donorType === "business" && logoUri) {
        companyLogoUrl = await uploadPickedPhoto(logoUri, `sponsorshipLogos/${user?.uid ?? "guest"}/${Date.now()}.jpg`);
      }

      const intent = await createSponsorshipIntent({
        tierId: tier.id,
        donorType,
        donorName: donorName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(companyLogoUrl ? { companyLogoUrl } : {}),
        ...(tier.priceCents == null
          ? { customAmountCents, ...(customNote.trim() ? { customNote: customNote.trim() } : {}) }
          : {}),
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
    } catch (e) {
      setError(callableMessage(e, "Payment succeeded but confirming it failed. Contact us with your payment receipt."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Thank you for your support!</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 8, textAlign: "center", lineHeight: 19 }}>
            Your {tier?.label.toLowerCase()} sponsorship{paidAmountCents ? ` (${formatDollars(paidAmountCents)})` : ""} is confirmed. Our team
            will follow up by email.
          </Text>
          <PrimaryButton onPress={onClose} style={{ marginTop: 20, width: "100%" }}>DONE</PrimaryButton>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 20, marginBottom: 4 }}>Become a Sponsor</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
        Pick a tier, tell us about yourself, then pay securely through Stripe.
      </Text>

      {step === "pay" && clientSecret && publishableKey && (
        <>
          {error && <Text style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>}
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaid={() => void onCardPaid()}
            onError={setError}
            statusText={`Enter card details for your ${paidAmountCents != null ? formatDollars(paidAmountCents) : ""} sponsorship.`}
            payLabel={`PAY ${paidAmountCents != null ? formatDollars(paidAmountCents) : ""}`}
          />
        </>
      )}

      {step === "form" && (
      <>
      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>Choose a tier</Text>
      <View style={{ gap: 10, marginBottom: 16 }}>
        {SPONSORSHIP_TIERS.map((t) => {
          const active = tierId === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTierId(t.id)}
              activeOpacity={0.7}
              style={[styles.tierCard, active && styles.tierCardActive]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "800", fontSize: 16 }}>{t.label}</Text>
                <Text style={{ fontWeight: "800", fontSize: 15, color: theme.color.purple }}>
                  {t.priceCents != null ? formatDollars(t.priceCents) : "Name your amount"}
                </Text>
              </View>
              <Text style={{ fontSize: 12.5, color: theme.color.textMuted, fontStyle: "italic", marginTop: 2 }}>{t.tagline}</Text>
              {active &&
                t.perks.map((perk) => (
                  <Text key={perk} style={{ fontSize: 12.5, marginTop: 4 }}>• {perk}</Text>
                ))}
            </TouchableOpacity>
          );
        })}
      </View>

      {tier && (
        <>
          {tier.priceCents == null && (
            <>
              <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Your amount ($)</Text>
              <TextInput
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="number-pad"
                placeholder="e.g. 2500"
                style={styles.input}
              />
              <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>What would you like to include? (optional)</Text>
              <TextInput
                value={customNote}
                onChangeText={setCustomNote}
                multiline
                numberOfLines={3}
                placeholder="Tell us what matters to you — signage, jerseys, media, anything else…"
                style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              />
            </>
          )}

          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>You're sponsoring as</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
            <Pill active={donorType === "individual"} onPress={() => setDonorType("individual")}>Individual</Pill>
            <Pill active={donorType === "business"} onPress={() => setDonorType("business")}>Business</Pill>
          </View>

          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>{donorType === "business" ? "Company name" : "Full name"}</Text>
          <TextInput value={donorName} onChangeText={setDonorName} style={styles.input} />

          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Phone (optional)</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />

          {donorType === "business" && (
            <>
              <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Company logo (optional)</Text>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={{ width: 80, height: 80, borderRadius: 8, marginBottom: 14 }} resizeMode="contain" />
              ) : (
                <PrimaryButton onPress={pickLogo} style={{ marginBottom: 14 }}>📷 CHOOSE LOGO</PrimaryButton>
              )}
            </>
          )}

          {error && <Text style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>}
          <PrimaryButton disabled={!canSubmit || busy} onPress={() => void continueToPayment()} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : "CONTINUE TO PAYMENT"}
          </PrimaryButton>
        </>
      )}
      </>
      )}

      {step === "form" && (
        <Text onPress={() => setShowInquiry(true)} style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: theme.color.textMuted }}>
          Prefer to just talk to our team first? Send an inquiry instead →
        </Text>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  tierCard: { borderWidth: 2, borderColor: theme.color.border, borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  tierCardActive: { borderColor: theme.color.purple, backgroundColor: "#F7F0FF" },
  input: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5, marginBottom: 12 },
});
