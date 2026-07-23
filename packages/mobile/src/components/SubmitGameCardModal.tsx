import { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import { theme } from "../lib/theme";
import { submitGameCard } from "../lib/callables";
import { Modal, PrimaryButton } from "./ui";

export function SubmitGameCardModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const [step, setStep] = useState<"capture" | "scanning" | "done">("capture");
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
  }

  async function submit() {
    if (!uri) return;
    setStep("scanning");
    setError(null);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `gameCards/${gameId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const photoUrl = await getDownloadURL(storageRef);
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

  if (step === "scanning") {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontWeight: "700" }}>Reading the card…</Text>
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
