import { useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { fileIncident } from "../lib/callables";
import { PrimaryButton } from "../components/ui";

export function ComplaintScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Complaint">) {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!profile || text.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const filed = await fileIncident({
        source: "fan_message",
        filedByName: profile.displayName,
        filedByRole: profile.primaryRole,
        text,
      });
      setCaseNumber(filed.data.caseNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your report.");
    } finally {
      setBusy(false);
    }
  }

  if (caseNumber) {
    return (
      <View style={styles.doneWrap}>
        <Text style={{ fontSize: 40 }}>✓</Text>
        <Text style={styles.h1}>We've got it.</Text>
        <Text style={styles.sub}>Case #{caseNumber} is with the Commissioner.</Text>
        <PrimaryButton onPress={() => navigation.goBack()} style={{ marginTop: 20, width: "100%" }}>DONE</PrimaryButton>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }}>
      <Text style={styles.h1}>Report an issue</Text>
      <Text style={styles.sub}>This goes straight to the Commissioner.</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Tell us what happened…"
        multiline
        numberOfLines={5}
        style={styles.textarea}
      />
      {error && <Text style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>}
      <PrimaryButton disabled={text.trim().length < 3 || busy} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Sending…" : "SEND REPORT"}
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontWeight: "800", fontSize: 20, marginBottom: 6, textAlign: "center" },
  sub: { color: theme.color.textMuted, fontSize: 13, marginBottom: 14, textAlign: "center" },
  textarea: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 13.5,
    minHeight: 110,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  doneWrap: { flex: 1, backgroundColor: theme.color.bg, alignItems: "center", justifyContent: "center", padding: 30 },
});
