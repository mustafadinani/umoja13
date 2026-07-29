import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS, VOLUNTEER_AVAILABILITY_DAYS } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useTeams } from "../hooks/useData";
import { Modal, PrimaryButton, Pill } from "./ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());
const isValidPhone = (v: string) => v.replace(/\D/g, "").length >= 7;

export function BecomeVolunteerModal({ onClose, initialName }: { onClose: () => void; initialName?: string }) {
  const { user, profile } = useAuth();
  const { data: categories } = useCategories();
  const [name, setName] = useState(initialName ?? profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const { data: teams } = useTeams(categoryId || undefined);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleDay(day: string) {
    setAvailability((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  const formValid =
    !!name.trim() && isValidEmail(email) && isValidPhone(phone) && !!emergencyContact.trim() && availability.length > 0;

  async function submit() {
    if (!user || !formValid) return;
    setBusy(true);
    setError(null);
    try {
      let selfieUrl: string | undefined;
      if (file) {
        try {
          const path = `volunteers/${user.uid}/${Date.now()}-${file.name}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, file);
          selfieUrl = await getDownloadURL(storageRef);
        } catch {
          throw new Error("Couldn't upload your photo — check your connection and try again (or skip the photo).");
        }
      }

      await addDoc(collection(db, COLLECTIONS.volunteerApplications), {
        name,
        email,
        phone,
        emergencyContact,
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
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${email.trim() && !isValidEmail(email) ? theme.color.danger : theme.color.border}`, marginBottom: email.trim() && !isValidEmail(email) ? 4 : 12, fontSize: 13.5 }}
      />
      {email.trim().length > 0 && !isValidEmail(email) && (
        <div style={{ color: theme.color.danger, fontSize: 11.5, marginBottom: 12 }}>Enter a valid email address.</div>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Phone</div>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${phone.trim() && !isValidPhone(phone) ? theme.color.danger : theme.color.border}`, marginBottom: phone.trim() && !isValidPhone(phone) ? 4 : 12, fontSize: 13.5 }}
      />
      {phone.trim().length > 0 && !isValidPhone(phone) && (
        <div style={{ color: theme.color.danger, fontSize: 11.5, marginBottom: 12 }}>Enter a valid phone number.</div>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Emergency contact (name & phone)</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 6 }}>
        Someone we can reach if we can't reach you during the tournament.
      </div>
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

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Tournament category (optional)</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 6 }}>
        If you also play or coach, let us know so we can schedule you around your own games.
      </div>
      <select
        value={categoryId}
        onChange={(e) => { setCategoryId(e.target.value); setTeamId(""); }}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5, background: "#fff" }}
      >
        <option value="">Not applicable</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>

      {categoryId && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Team (optional)</div>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5, background: "#fff" }}
          >
            <option value="">Select a team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Photo (optional)</div>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ marginBottom: 16 }} />

      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <PrimaryButton disabled={busy || !formValid} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Submitting…" : "SUBMIT APPLICATION"}
      </PrimaryButton>
    </Modal>
  );
}
