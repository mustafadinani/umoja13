import { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS, type Challenge, type ChallengeSubmission, type HuntCrew } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";
import { LoadingImage } from "./LoadingImage";
import { Lightbox } from "./Lightbox";

export function ChallengeDetailModal({
  challenge,
  crew,
  mySubmission,
  onClose,
}: {
  challenge: Challenge;
  crew: HuntCrew;
  mySubmission: ChallengeSubmission | null;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [lightbox, setLightbox] = useState<{ uri: string; mediaType: "photo" | "video" } | null>(null);

  const done = crew.challengesCompleted?.includes(challenge.id) ?? false;

  function renderMediaPreview(uri: string, mediaType: string | undefined) {
    if (mediaType === "video") {
      return (
        <TouchableOpacity onPress={() => setLightbox({ uri, mediaType: "video" })} style={{ marginBottom: 12 }}>
          <View style={styles.videoPreview}>
            <Text style={{ fontSize: 28 }}>▶</Text>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", marginTop: 4 }}>TAP TO PLAY VIDEO</Text>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={() => setLightbox({ uri, mediaType: "photo" })}>
        <LoadingImage source={{ uri }} style={{ width: "100%", height: 160, borderRadius: 8, marginBottom: 12 }} />
      </TouchableOpacity>
    );
  }
  const now = Date.now();
  const notYetOpen = challenge.startsAt && now < challenge.startsAt;
  const closed = challenge.deadline && now > challenge.deadline;
  const allowVideo = challenge.answerType !== "photo_only";
  const allowPhoto = challenge.answerType !== "video_only";

  async function pickMedia(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const mediaTypes: ("images" | "videos")[] = allowPhoto && allowVideo ? ["images", "videos"] : allowVideo ? ["videos"] : ["images"];
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: 0.7 });
    if (!result.canceled && result.assets[0]) setMediaUri(result.assets[0].uri);
  }

  async function submit() {
    if (!mediaUri || !user || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      const isVideo = mediaUri.endsWith(".mov") || mediaUri.endsWith(".mp4");
      const path = `challengeSubmissions/${challenge.id}/${user.uid}-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: isVideo ? "video/mp4" : "image/jpeg" });
      const mediaUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, COLLECTIONS.challengeSubmissions), {
        challengeId: challenge.id,
        crewId: crew.id,
        submittedBy: user.uid,
        submittedByName: profile.displayName,
        mediaType: isVideo ? "video" : "photo",
        mediaUrl,
        status: "pending",
        createdAt: Date.now(),
      });
      setJustSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit this challenge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 18 }}>⚡ {challenge.title}</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginVertical: 6 }}>+{challenge.points} pts</Text>
      <Text style={{ marginBottom: 14 }}>{challenge.description}</Text>

      {challenge.earlyBirdBonuses.length > 0 && (
        <View style={{ backgroundColor: "#FFF6DD", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <Text style={{ fontSize: 12.5 }}>
            🏅 Early-bird bonus for the first {challenge.earlyBirdBonuses.length} crews to submit: +{challenge.earlyBirdBonuses.join(" / +")} pts
          </Text>
        </View>
      )}

      {done || mySubmission?.status === "approved" ? (
        <>
          {mySubmission?.mediaUrl && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
          <View style={{ backgroundColor: theme.color.successBg, borderRadius: 8, padding: 12 }}>
            <Text style={{ color: theme.color.success, fontWeight: "700", textAlign: "center" }}>
              Done ✓ {mySubmission?.bonusPoints ? `— +${mySubmission.bonusPoints} early-bird bonus!` : ""}
            </Text>
          </View>
        </>
      ) : mySubmission?.status === "pending" || justSubmitted ? (
        <>
          {mySubmission?.mediaUrl && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
          <View style={{ backgroundColor: theme.color.warningBg, borderRadius: 8, padding: 12 }}>
            <Text style={{ color: theme.color.warning, fontWeight: "700", textAlign: "center" }}>Submitted — a facilitator will take a look shortly.</Text>
          </View>
        </>
      ) : notYetOpen ? (
        <Text style={{ color: theme.color.textMuted, fontSize: 13, textAlign: "center" }}>Opens {new Date(challenge.startsAt!).toLocaleString()}</Text>
      ) : closed ? (
        <Text style={{ color: theme.color.danger, fontSize: 13, textAlign: "center", fontWeight: "700" }}>This challenge has closed.</Text>
      ) : (
        <>
          {mySubmission?.status === "rejected" && (
            <>
              {mySubmission?.mediaUrl && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
              <View style={{ backgroundColor: theme.color.dangerBg, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <Text style={{ color: theme.color.danger, fontSize: 12.5, textAlign: "center" }}>Not approved — try submitting again.</Text>
              </View>
            </>
          )}
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={{ width: "100%", height: 160, borderRadius: 8, marginBottom: 12 }} />
          ) : (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <PrimaryButton onPress={() => pickMedia(true)} style={{ flex: 1 }}>📷 Camera</PrimaryButton>
              <PrimaryButton onPress={() => pickMedia(false)} style={{ flex: 1 }}>🖼 Library</PrimaryButton>
            </View>
          )}
          {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</Text>}
          <PrimaryButton disabled={!mediaUri || busy} onPress={submit} style={{ width: "100%" }}>
            {busy ? "Submitting…" : "SUBMIT FOR REVIEW"}
          </PrimaryButton>
        </>
      )}
      <Lightbox visible={!!lightbox} src={lightbox?.uri ?? null} mediaType={lightbox?.mediaType} onClose={() => setLightbox(null)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  videoPreview: { width: "100%", height: 160, borderRadius: 8, backgroundColor: theme.color.navy, alignItems: "center", justifyContent: "center" },
});
