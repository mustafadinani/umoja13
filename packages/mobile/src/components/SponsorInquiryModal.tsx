import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";

export function SponsorInquiryModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!user || !orgName.trim() || !contactName.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, COLLECTIONS.sponsorInquiries), {
        orgName: orgName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
        filedByUid: user.uid,
        status: "new",
        createdAt: Date.now(),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your inquiry.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Thanks for reaching out!</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, textAlign: "center" }}>
            Our team will follow up at {email} to talk through sponsorship options.
          </Text>
          <PrimaryButton style={{ marginTop: 18, width: "100%" }} onPress={onClose}>DONE</PrimaryButton>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 20, marginBottom: 4 }}>Become a Sponsor</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 14 }}>
        Tell us about your organization and we'll follow up with tiers and pricing.
      </Text>

      <TextInput placeholder="Organization name" value={orgName} onChangeText={setOrgName} style={styles.input} />
      <TextInput placeholder="Contact name" value={contactName} onChangeText={setContactName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
      <TextInput placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
      <TextInput
        placeholder="What kind of sponsorship are you interested in? (optional)"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
        style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
      />

      {error && <Text style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>}
      <PrimaryButton disabled={busy || !orgName.trim() || !contactName.trim() || !email.trim()} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Sending…" : "SEND INQUIRY"}
      </PrimaryButton>
    </Modal>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5, marginBottom: 10 },
});
