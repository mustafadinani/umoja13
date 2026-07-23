import { useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { COLLECTIONS, CATEGORIES } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { verifyCheckIn } from "../lib/callables";
import { useCheckIn, usePass } from "../hooks/useData";
import { PrimaryButton } from "../components/ui";

type Step = "confirm" | "selfie" | "govid" | "verifying" | "result";

function checkInIdFor(uid: string, teamId: string, categoryId: string) {
  return `${uid}_${teamId}_${categoryId}`;
}

export function CheckInScreen({ route }: NativeStackScreenProps<RootStackParamList, "CheckIn">) {
  const { teamId, categoryId } = route.params;
  const { user, profile } = useAuth();
  const checkInId = user ? checkInIdFor(user.uid, teamId, categoryId) : "";
  const { data: existingCheckIn } = useCheckIn(checkInId);
  const { data: pass } = usePass(checkInId);
  const category = CATEGORIES.find((c) => c.id === categoryId);

  const [step, setStep] = useState<Step>(existingCheckIn?.status === "approved" ? "result" : "confirm");
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [govIdUri, setGovIdUri] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; reason?: string } | null>(
    existingCheckIn?.status === "approved" ? { status: "approved" } : null
  );
  const [error, setError] = useState<string | null>(null);

  async function capture(setUri: (u: string) => void) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!r.canceled && r.assets[0]) setUri(r.assets[0].uri);
  }

  async function uploadUri(uri: string, path: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    return getDownloadURL(storageRef);
  }

  async function submit() {
    if (!user || !profile || !selfieUri || !govIdUri) return;
    setStep("verifying");
    setError(null);
    try {
      const existing = await getDoc(doc(db, COLLECTIONS.checkIns, checkInId));
      const attempt = existing.exists() ? (existing.data().attempt ?? 0) + 1 : 1;
      const selfieUrl = await uploadUri(selfieUri, `checkins/${user.uid}/${checkInId}/selfie-${Date.now()}.jpg`);
      const govIdUrl = await uploadUri(govIdUri, `checkins/${user.uid}/${checkInId}/govid-${Date.now()}.jpg`);
      await setDoc(
        doc(db, COLLECTIONS.checkIns, checkInId),
        { id: checkInId, userId: user.uid, teamId, categoryId, status: "pending_review", selfieUrl, govIdUrl, submittedAt: Date.now(), attempt },
        { merge: true }
      );
      const res = await verifyCheckIn({ checkInId });
      setResult(res.data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong verifying your check-in.");
      setResult({ status: "error" });
      setStep("result");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }}>
      {step === "confirm" && (
        <View>
          <Text style={styles.h1}>Is this you?</Text>
          <View style={styles.infoCard}>
            <Row label="Name" value={profile?.displayName ?? ""} />
            <Row label="Category" value={category?.label ?? categoryId} />
            <Row label="Waiver" value="Signed at registration ✓" />
          </View>
          <PrimaryButton onPress={() => setStep("selfie")} style={{ width: "100%" }}>YES, THAT'S ME</PrimaryButton>
        </View>
      )}

      {step === "selfie" && (
        <View>
          <Text style={styles.h1}>Take a selfie</Text>
          <Text style={styles.sub}>Staff match it to your Tournament Pass at the gate.</Text>
          {selfieUri ? <Image source={{ uri: selfieUri }} style={styles.preview} /> : <PrimaryButton onPress={() => capture(setSelfieUri)} style={{ marginBottom: 12 }}>📷 TAKE SELFIE</PrimaryButton>}
          <PrimaryButton disabled={!selfieUri} onPress={() => setStep("govid")} style={{ width: "100%" }}>LOOKS GOOD — CONTINUE</PrimaryButton>
        </View>
      )}

      {step === "govid" && (
        <View>
          <Text style={styles.h1}>Government-issued ID</Text>
          <Text style={styles.sub}>For age verification only.</Text>
          {govIdUri ? <Image source={{ uri: govIdUri }} style={styles.preview} /> : <PrimaryButton onPress={() => capture(setGovIdUri)} style={{ marginBottom: 12 }}>📷 TAKE PHOTO OF ID</PrimaryButton>}
          <PrimaryButton disabled={!govIdUri} onPress={submit} style={{ width: "100%" }}>SUBMIT FOR AI CHECK</PrimaryButton>
        </View>
      )}

      {step === "verifying" && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <Text style={{ fontWeight: "700", fontSize: 16 }}>Checking your details…</Text>
        </View>
      )}

      {step === "result" && result && (
        <View style={{ alignItems: "center", paddingTop: 20 }}>
          {result.status === "approved" ? (
            <>
              <Text style={{ fontSize: 40 }}>✓</Text>
              <Text style={styles.h1}>You're cleared to play!</Text>
              {pass?.qrPayload ? (
                <View style={styles.qrBox}><Text style={{ fontSize: 11, color: theme.color.textMuted }}>{pass.passId}</Text></View>
              ) : (
                <Text style={{ color: theme.color.warning, fontWeight: "700", marginTop: 10 }}>PENDING REVIEW</Text>
              )}
            </>
          ) : result.status === "admin_review" ? (
            <>
              <Text style={{ fontSize: 40 }}>⏳</Text>
              <Text style={styles.h1}>Sent to an admin</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 40 }}>✕</Text>
              <Text style={styles.h1}>We couldn't verify you</Text>
              <Text style={styles.sub}>{result.reason ?? error ?? "Try again."}</Text>
              <PrimaryButton onPress={() => { setStep("selfie"); setSelfieUri(null); setGovIdUri(null); }} style={{ marginTop: 16, width: "100%" }}>
                RETAKE & RESUBMIT
              </PrimaryButton>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: theme.color.textMuted }}>{label}</Text>
      <Text style={{ fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontWeight: "800", fontSize: 20, marginBottom: 8, textAlign: "center" },
  sub: { color: theme.color.textMuted, fontSize: 13, marginBottom: 14, textAlign: "center" },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginVertical: 14 },
  preview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 14 },
  qrBox: { width: 160, height: 160, backgroundColor: theme.color.navy, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 14 },
});
