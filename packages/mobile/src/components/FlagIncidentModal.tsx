import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { fileIncident } from "../lib/callables";
import { Modal, PrimaryButton } from "./ui";

export function FlagIncidentModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  async function submit() {
    if (!profile || text.trim().length < 5) return;
    setBusy(true);
    try {
      const res = await fileIncident({ source: "referee_flag", filedByName: profile.displayName, filedByRole: "referee", gameId, text });
      setCaseNumber(res.data.caseNumber);
    } finally {
      setBusy(false);
    }
  }

  if (caseNumber) {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Sent to the commissioner</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>Case #{caseNumber}</Text>
          <PrimaryButton style={{ marginTop: 16, width: "100%" }} onPress={onClose}>DONE</PrimaryButton>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 4 }}>Flag an incident</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 12 }}>Explain what happened for the commissioner.</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={4}
        style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5, minHeight: 90, textAlignVertical: "top", marginBottom: 14 }}
      />
      <PrimaryButton disabled={text.trim().length < 5 || busy} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Sending…" : "SEND TO COMMISSIONER"}
      </PrimaryButton>
    </Modal>
  );
}
