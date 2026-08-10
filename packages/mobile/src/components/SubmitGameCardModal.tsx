import { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadPickedPhoto } from "../lib/uploadPhoto";
import { theme } from "../lib/theme";
import { submitGameCard } from "../lib/callables";
import { Modal, PrimaryButton } from "./ui";

export function SubmitGameCardModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const [step, setStep] = useState<"capture" | "uploading" | "done">("capture");
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
  }

  async function submit() {
    if (!uri) return;
    setStep("uploading");
    setError(null);
    try {
      const photoUrl = await uploadPickedPhoto(uri, `gameCards/${gameId}/${Date.now()}.jpg`);
      await submitGameCard({ gameId, photoUrl });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit the game card.");
      setStep("capture");
    }
  }

  if (step === "done") {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Sent to Commissioner</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, textAlign: "center" }}>
            The result is provisional until they call it final.
          </Text>
          <PrimaryButton style={{ marginTop: 16, width: "100%" }} onPress={onClose}>DONE</PrimaryButton>
        </View>
      </Modal>
    );
  }

  if (step === "uploading") {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontWeight: "700" }}>Uploading…</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 20, marginBottom: 4 }}>Submit game card</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 14 }}>Photograph the paper match card.</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} />
      ) : (
        <PrimaryButton onPress={capture} style={{ marginBottom: 16 }}>📷 CAPTURE CARD</PrimaryButton>
      )}
      {error && <Text style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</Text>}
      <PrimaryButton disabled={!uri} onPress={submit} style={{ width: "100%" }}>CAPTURE & SEND TO COMMISSIONER</PrimaryButton>
    </Modal>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 8, marginBottom: 16 },
});
