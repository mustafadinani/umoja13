import { useState } from "react";
import { View, Text, TextInput, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CATEGORIES, COLLECTIONS, type PlayerMembership } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useTeams } from "../hooks/useData";
import { Modal, Pill, PrimaryButton } from "./ui";

export function JoinTeamModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: teams } = useTeams(categoryId ?? undefined);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
  }

  async function submit() {
    if (!user || !profile || !categoryId || !teamId || !uri) return;
    setBusy(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `checkins/${user.uid}/registration/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const registrationPhotoUrl = await getDownloadURL(storageRef);

      const membership: PlayerMembership = {
        teamId, categoryId, jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined, isCaptain: false, registrationPhotoUrl,
      };
      await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
        playerOf: arrayUnion(membership),
        roles: Array.from(new Set([...(profile.roles ?? []), "player"])),
        primaryRole: "player",
        updatedAt: Date.now(),
      });
      await updateDoc(doc(db, COLLECTIONS.teams, teamId), {
        roster: arrayUnion({
          userId: user.uid, displayName: profile.displayName, jerseyNumber: membership.jerseyNumber ?? null,
          isCaptain: false, goals: 0, assists: 0, checkInStatus: "not_started",
        }),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Join a team</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {CATEGORIES.map((c) => <Pill key={c.id} active={categoryId === c.id} onPress={() => { setCategoryId(c.id); setTeamId(null); }}>{c.label}</Pill>)}
      </View>
      {categoryId && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {teams.map((t) => <Pill key={t.id} active={teamId === t.id} onPress={() => setTeamId(t.id)} bg={teamId === t.id ? t.color : undefined}>{t.name}</Pill>)}
        </View>
      )}
      <TextInput
        placeholder="Jersey number"
        keyboardType="number-pad"
        value={jerseyNumber}
        onChangeText={setJerseyNumber}
        style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, marginBottom: 12 }}
      />
      {uri ? <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginBottom: 12 }} /> : (
        <PrimaryButton onPress={pickPhoto} style={{ marginBottom: 12 }}>📷 Add registration photo</PrimaryButton>
      )}
      <PrimaryButton disabled={!categoryId || !teamId || !uri || busy} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Joining…" : "JOIN TEAM"}
      </PrimaryButton>
    </Modal>
  );
}
