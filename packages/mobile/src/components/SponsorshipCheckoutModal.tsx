import { useState } from "react";
import { View, Text, TextInput, Image, Linking, StyleSheet, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SPONSORSHIP_TIERS, type SponsorTier, type SponsorshipDonorType } from "@umoja/shared";
import { storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { createSponsorshipCheckout } from "../lib/callables";
import { Modal, PrimaryButton, Pill } from "./ui";
import { SponsorInquiryModal } from "./SponsorInquiryModal";

const WEB_APP_URL = "https://umoja-games-proto.web.app";

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

export function SponsorshipCheckoutModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [showInquiry, setShowInquiry] = useState(false);
  const [tierId, setTierId] = useState<SponsorTier | null>(null);
  const [donorType, setDonorType] = useState<SponsorshipDonorType>("individual");
  const [donorName, setDonorName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (showInquiry) return <SponsorInquiryModal onClose={onClose} />;

  const tier = SPONSORSHIP_TIERS.find((t) => t.id === tierId) ?? null;
  const customAmountCents = Math.round(parseFloat(customAmount || "0") * 100);
  const validCustomAmount = tier?.priceCents == null ? customAmountCents >= 100 : true;
  const canSubmit = !!tier && !!donorName.trim() && !!email.trim() && validCustomAmount;

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setLogoUri(result.assets[0].uri);
  }

  async function checkout() {
    if (!tier || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      let companyLogoUrl: string | undefined;
      if (donorType === "business" && logoUri) {
        const response = await fetch(logoUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `sponsorshipLogos/${user?.uid ?? "guest"}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
        companyLogoUrl = await getDownloadURL(storageRef);
      }

      const res = await createSponsorshipCheckout({
        tierId: tier.id,
        donorType,
        donorName: donorName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(companyLogoUrl ? { companyLogoUrl } : {}),
        ...(tier.priceCents == null
          ? { customAmountCents, ...(customNote.trim() ? { customNote: customNote.trim() } : {}) }
          : {}),
        successUrl: `${WEB_APP_URL}/?sponsored=1`,
        cancelUrl: WEB_APP_URL,
      });

      if (res.data.checkoutUrl) {
        Linking.openURL(res.data.checkoutUrl);
      } else {
        setError("Couldn't start checkout.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 20, marginBottom: 4 }}>Become a Sponsor</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
        Pick a tier, tell us about yourself, then pay securely through Stripe.
      </Text>

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
          <PrimaryButton disabled={!canSubmit || busy} onPress={checkout} style={{ width: "100%" }}>
            {busy ? "Redirecting to Stripe…" : "CONTINUE TO PAYMENT"}
          </PrimaryButton>
        </>
      )}

      <Text onPress={() => setShowInquiry(true)} style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: theme.color.textMuted }}>
        Prefer to just talk to our team first? Send an inquiry instead →
      </Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tierCard: { borderWidth: 2, borderColor: theme.color.border, borderRadius: 10, padding: 12, backgroundColor: "#fff" },
  tierCardActive: { borderColor: theme.color.purple, backgroundColor: "#F7F0FF" },
  input: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5, marginBottom: 12 },
});
