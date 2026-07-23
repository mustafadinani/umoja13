import { useState } from "react";
import { View, Text, TextInput, Linking } from "react-native";
import type { ComplaintType } from "@umoja/shared";
import { theme } from "../lib/theme";
import { fileIncident, createComplaintCheckout } from "../lib/callables";
import { useAuth } from "../auth/AuthProvider";
import { Modal, PrimaryButton, Pill } from "./ui";

const TYPES: { id: ComplaintType; label: string }[] = [
  { id: "ineligible_player", label: "Ineligible Player" },
  { id: "game_related", label: "Game Related" },
  { id: "other", label: "Other" },
];

const WEB_APP_URL = "https://umoja-games-proto.web.app";

export function CaptainComplaintModal({ teamName, onClose }: { teamName: string; onClose: () => void }) {
  const { profile } = useAuth();
  const [type, setType] = useState<ComplaintType | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!type || text.trim().length < 3 || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const filed = await fileIncident({
        source: "captain_complaint",
        filedByName: profile.displayName,
        filedByRole: `captain, ${teamName}`,
        complaintType: type,
        text,
      });
      setCaseNumber(filed.data.caseNumber);
      try {
        const checkout = await createComplaintCheckout({
          incidentId: filed.data.id,
          successUrl: `${WEB_APP_URL}/dashboard?complaintPaid=1`,
          cancelUrl: `${WEB_APP_URL}/dashboard`,
        });
        setCheckoutUrl(checkout.data.checkoutUrl);
      } catch (checkoutErr) {
        setCheckoutError(checkoutErr instanceof Error ? checkoutErr.message : "Couldn't start the $35 payment.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't file your complaint.");
    } finally {
      setBusy(false);
    }
  }

  if (caseNumber) {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>We've got it.</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, textAlign: "center" }}>
            Case #{caseNumber} is with the Commissioner. $35 review fee is refunded if the complaint is upheld.
          </Text>
          {checkoutUrl && (
            <PrimaryButton style={{ marginTop: 16, width: "100%" }} onPress={() => Linking.openURL(checkoutUrl)}>
              PAY $35 & SUBMIT
            </PrimaryButton>
          )}
          {checkoutError && (
            <Text style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 14, textAlign: "center" }}>
              Case filed, but the $35 payment step couldn't start ({checkoutError}). The Commissioner has your case
              number — contact them if you're not prompted to pay.
            </Text>
          )}
          <Text onPress={onClose} style={{ marginTop: 10, color: theme.color.textMuted, fontSize: 13 }}>Close</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 4 }}>File a complaint</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 14 }}>This goes straight to the Commissioner.</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {TYPES.map((t) => (
          <Pill key={t.id} active={type === t.id} onPress={() => setType(t.id)}>{t.label}</Pill>
        ))}
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Tell us what happened…"
        multiline
        numberOfLines={4}
        style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5, minHeight: 90, textAlignVertical: "top", marginBottom: 12 }}
      />
      <Text style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 14 }}>
        A $35 review fee applies, refunded if the complaint is upheld.
      </Text>
      {error && <Text style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>}
      <PrimaryButton disabled={!type || text.trim().length < 3 || busy} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Filing…" : "CONTINUE TO $35 FEE"}
      </PrimaryButton>
    </Modal>
  );
}
