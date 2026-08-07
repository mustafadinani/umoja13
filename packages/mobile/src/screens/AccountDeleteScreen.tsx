import { useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { db } from "../lib/firebase";
import { theme } from "../lib/theme";
import { PrimaryButton } from "../components/ui";

export function AccountDeleteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "AccountDelete">) {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState(profile?.email ?? user?.email ?? "");
  const [confirmText, setConfirmText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const confirmed = confirmText.trim().toUpperCase() === "DELETE";

  async function submit() {
    if (!user || !email.trim() || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, COLLECTIONS.accountDelete), {
        uid: user.uid,
        email: email.trim(),
        displayName: profile?.displayName ?? user.displayName ?? "",
        ...(note.trim() ? { note: note.trim() } : {}),
        status: "pending",
        createdAt: Date.now(),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit your request.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={styles.doneWrap}>
        <Text style={{ fontSize: 40 }}>✓</Text>
        <Text style={styles.h1}>Request received</Text>
        <Text style={styles.sub}>
          We'll delete your account and associated data. You'll get a confirmation at {email.trim()} when it's done.
        </Text>
        <PrimaryButton onPress={() => navigation.goBack()} style={{ marginTop: 20, width: "100%" }}>
          DONE
        </PrimaryButton>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Delete Account</Text>
      <Text style={styles.sub}>
        Request permanent deletion of your Umoja13 account and associated personal data. This cannot be undone once processed.
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholder="Email on the account"
      />

      <Text style={styles.label}>Type DELETE to confirm</Text>
      <TextInput
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
        style={styles.input}
        placeholder="DELETE"
      />

      <Text style={styles.label}>Anything we should know? (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
        placeholder="Optional"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton
        disabled={busy || !email.trim() || !confirmed}
        onPress={submit}
        style={{ width: "100%", marginTop: 8, backgroundColor: theme.color.danger }}
      >
        {busy ? "Submitting…" : "REQUEST ACCOUNT DELETION"}
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  doneWrap: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  h1: { fontWeight: "800", fontSize: 22, marginBottom: 8, color: theme.color.text },
  sub: { color: theme.color.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  label: { fontWeight: "700", fontSize: 12, color: theme.color.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  error: { color: theme.color.danger, fontSize: 13, marginBottom: 10 },
});
