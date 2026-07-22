import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS, VOLUNTEER_AVAILABILITY_DAYS } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton, Pill } from "./ui";

export function BecomeVolunteerModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleDay(day: string) {
    setAvailability((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function submit() {
    if (!user || !name.trim() || !email.trim() || !phone.trim() || !emergencyContact.trim() || availability.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      let selfieUrl: string | undefined;
      if (file) {
        const path = `volunteers/${user.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        selfieUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, COLLECTIONS.volunteerApplications), {
        name,
        email,
        phone,
        emergencyContact,
        availability,
        ...(selfieUrl ? { selfieUrl } : {}),
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
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Thanks for signing up!</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            An organizer will review your application and follow up with your shifts.
          </div>
          <PrimaryButton style={{ marginTop: 18, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Become a Volunteer</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
        Help us run Umoja Games — setup, check-in support, water/shade, pack-down, and more.
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Full name</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Email</div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Phone</div>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Emergency contact (name & phone)</div>
      <input
        value={emergencyContact}
        onChange={(e) => setEmergencyContact(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Available days</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {VOLUNTEER_AVAILABILITY_DAYS.map((day) => (
          <Pill key={day} active={availability.includes(day)} onClick={() => toggleDay(day)}>{day}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Photo (optional)</div>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ marginBottom: 16 }} />

      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <PrimaryButton
        disabled={busy || !name.trim() || !email.trim() || !phone.trim() || !emergencyContact.trim() || availability.length === 0}
        onClick={submit}
        style={{ width: "100%" }}
      >
        {busy ? "Submitting…" : "SUBMIT APPLICATION"}
      </PrimaryButton>
    </Modal>
  );
}
