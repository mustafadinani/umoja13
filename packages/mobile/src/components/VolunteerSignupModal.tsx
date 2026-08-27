import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS, VOLUNTEER_AVAILABILITY_DAYS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { uploadPickedPhoto } from "../lib/uploadPhoto";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useTeams } from "../hooks/useData";
import { Modal, PrimaryButton, Pill } from "./ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());
const isValidPhone = (v: string) => v.replace(/\D/g, "").length >= 7;

export function VolunteerSignupModal({ onClose, initialName }: { onClose: () => void; initialName?: string }) {
  const { user, profile } = useAuth();
  const { data: categories } = useCategories();
  const [name, setName] = useState(initialName ?? profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const { data: teams } = useTeams(categoryId ?? undefined);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleDay(day: string) {
    setAvailability((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function pickSelfie() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!result.canceled && result.assets[0]) setSelfieUri(result.assets[0].uri);
  }

  const formValid = !!name.trim() && isValidEmail(email) && isValidPhone(phone) && availability.length > 0;

  async function submit() {
    if (!user || !formValid) return;
    setBusy(true);
    setError(null);
    try {
      // The photo is genuinely optional — a failed upload (bad connection,
      // etc.) shouldn't block the whole application. Fall back to
      // submitting without it instead of throwing.
      let selfieUrl: string | undefined;
      if (selfieUri) {
        try {
          selfieUrl = await uploadPickedPhoto(selfieUri, `volunteers/${user.uid}/${Date.now()}.jpg`);
        } catch {
          setPhotoWarning("Couldn't upload your photo, so we submitted your application without it.");
        }
      }

      await addDoc(collection(db, COLLECTIONS.volunteerApplications), {
        name,
        email,
        phone,
        availability,
        ...(selfieUrl ? { selfieUrl } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(teamId ? { teamId } : {}),
        status: "pending",
        filedByUid: user.uid,
        createdAt: Date.now(),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit your application.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Thanks for signing up!</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, textAlign: "center" }}>
            An organizer will review your application and follow up with your shifts.
          </Text>
          {photoWarning && (
            <Text style={{ color: theme.color.warning, fontSize: 12.5, marginTop: 10, textAlign: "center" }}>{photoWarning}</Text>
          )}
          <PrimaryButton style={{ marginTop: 18, width: "100%" }} onPress={onClose}>DONE</PrimaryButton>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 19, marginBottom: 4 }}>Become a Volunteer</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>
        Help us run Umoja Games — setup, check-in support, water/shade, pack-down, and more.
      </Text>

      <Field label="Full name" value={name} onChangeText={setName} />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={email.trim().length > 0 && !isValidEmail(email) ? "Enter a valid email address." : undefined}
      />
      <Field
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        error={phone.trim().length > 0 && !isValidPhone(phone) ? "Enter a valid phone number." : undefined}
      />

      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Available days</Text>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
        {VOLUNTEER_AVAILABILITY_DAYS.map((day) => (
          <Pill key={day} active={availability.includes(day)} onPress={() => toggleDay(day)}>{day}</Pill>
        ))}
      </View>

      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Tournament category (optional)</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 6 }}>
        If you also play or coach, let us know so we can schedule you around your own games.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <Pill active={categoryId === null} onPress={() => { setCategoryId(null); setTeamId(null); }}>N/A</Pill>
        {categories.map((c) => (
          <Pill key={c.id} active={categoryId === c.id} onPress={() => { setCategoryId(c.id); setTeamId(null); }}>{c.label}</Pill>
        ))}
      </View>

      {categoryId && teams.length > 0 && (
        <>
          <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Team (optional)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {teams.map((t) => (
              <Pill key={t.id} active={teamId === t.id} onPress={() => setTeamId(teamId === t.id ? null : t.id)}>{t.name}</Pill>
            ))}
          </View>
        </>
      )}

      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Photo (optional)</Text>
      {selfieUri ? (
        <Text style={{ fontSize: 12.5, color: theme.color.success, marginBottom: 14 }}>Photo attached ✓</Text>
      ) : (
        <PrimaryButton onPress={pickSelfie} style={{ marginBottom: 14 }}>📷 TAKE A PHOTO</PrimaryButton>
      )}

      {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</Text>}
      <PrimaryButton disabled={busy || !formValid} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Submitting…" : "SUBMIT APPLICATION"}
      </PrimaryButton>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  helper,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences";
  helper?: string;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>{label}</Text>
      {helper && <Text style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 6 }}>{helper}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{ borderWidth: 1, borderColor: error ? theme.color.danger : theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 }}
      />
      {error && <Text style={{ color: theme.color.danger, fontSize: 11.5, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}
