import { useState } from "react";
import { View, Text, TextInput, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addDoc, arrayUnion, collection, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  CATEGORIES,
  COLLECTIONS,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  type PlayerMembership,
} from "@umoja/shared";
import { db, defaultDb, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useTeams } from "../hooks/useData";
import { Modal, Pill, PrimaryButton } from "./ui";

export function JoinTeamModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [playerName, setPlayerName] = useState(profile?.displayName ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: teams } = useTeams(categoryId ?? undefined);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
  }

  async function submit() {
    if (!user || !profile || !playerName.trim() || !categoryId || !teamId || !uri) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `checkins/${user.uid}/registration/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const registrationPhotoUrl = await getDownloadURL(storageRef);

      const team = teams.find((t) => t.id === teamId);
      const categoryLabel = CATEGORIES.find((c) => c.id === categoryId)?.label ?? "";
      const parts = playerName.trim().split(/\s+/);
      const firstName = parts[0] ?? playerName.trim();
      const lastName = parts.slice(1).join(" ");

      const playerDoc = await addDoc(collection(defaultDb, REGISTRATION_ROOT, REGISTRATION_YEAR, PLAYERS_REGISTERED), {
        firstName,
        lastName,
        category: categoryLabel,
        email: user.email ?? profile.email ?? "",
        phone: "",
        profilePicture: registrationPhotoUrl,
        status: "Registered. Pending Manager Review",
        teamId,
        teamName: team?.name ?? "",
        uid: user.uid,
        timestamp: new Date(),
        centerOptOut: false,
        attestLiabilityAgreement: true,
        attestParticipationAgreeement: true,
        attestRefundPolicy: true,
        pastGames: [],
        ...(jerseyNumber ? { jerseyNumber: Number(jerseyNumber) } : {}),
      });

      const membership: PlayerMembership = {
        teamId, categoryId, isCaptain: false, registrationPhotoUrl,
        // Omit rather than set `undefined` when no jersey number was given —
        // this object goes straight into arrayUnion() below, which rejects
        // an explicit `undefined` value outright, so joining without a
        // jersey number always failed.
        ...(jerseyNumber ? { jerseyNumber: Number(jerseyNumber) } : {}),
        playerName: playerName.trim(),
        // Own registration row's id — the same disambiguator Outreach-derived
        // memberships get automatically, so this child gets a proper
        // playerKey immediately (matters the moment a sibling joins too).
        profileId: playerDoc.id,
      };
      await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
        playerOf: arrayUnion(membership),
        roles: Array.from(new Set([...(profile.roles ?? []), "player"])),
        primaryRole: "player",
        updatedAt: Date.now(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the team.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Join a team</Text>
      <TextInput
        placeholder="Player's name — who's actually playing?"
        value={playerName}
        onChangeText={setPlayerName}
        style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, marginBottom: 12 }}
      />
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
      {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</Text>}
      <PrimaryButton disabled={!playerName.trim() || !categoryId || !teamId || !uri || busy} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Joining…" : "JOIN TEAM"}
      </PrimaryButton>
    </Modal>
  );
}
