import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";

export function SponsorInquiryModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!user || !orgName.trim() || !contactName.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(db, COLLECTIONS.sponsorInquiries), {
        orgName: orgName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
        filedByUid: user.uid,
        status: "new",
        createdAt: Date.now(),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your inquiry.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <Modal onClose={onClose}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Become a Sponsor</div>
        <div style={{ fontSize: 14, color: theme.color.textMuted }}>Sign in first, then come back to send your inquiry.</div>
      </Modal>
    );
  }

  if (done) {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Thanks for reaching out!</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            Our team will follow up at {email} to talk through sponsorship options.
          </div>
          <PrimaryButton style={{ marginTop: 18, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Become a Sponsor</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
        Tell us about your organization and we'll follow up with tiers and pricing.
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Organization name</div>
      <input
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Contact name</div>
      <input
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Email</div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Phone (optional)</div>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Message (optional)</div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="What kind of sponsorship are you interested in?"
        style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 16 }}
      />

      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <PrimaryButton
        disabled={busy || !orgName.trim() || !contactName.trim() || !email.trim()}
        onClick={submit}
        style={{ width: "100%" }}
      >
        {busy ? "Sending…" : "SEND INQUIRY"}
      </PrimaryButton>
    </Modal>
  );
}
