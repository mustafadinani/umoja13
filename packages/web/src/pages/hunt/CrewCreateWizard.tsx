import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS, type CrewMember } from "@umoja/shared";
import { db } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthProvider";
import { theme } from "../../lib/theme";
import { PrimaryButton, Card } from "../../components/ui";

const MAX_MEMBERS = 4; // including the lead

export function CrewCreateWizard() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [invites, setInvites] = useState<{ name: string; email: string }[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addInvite() {
    if (!inviteEmail.includes("@") || invites.length >= MAX_MEMBERS - 1) return;
    if (invites.some((i) => i.email.toLowerCase() === inviteEmail.toLowerCase())) return;
    setInvites((list) => [...list, { name: inviteName || inviteEmail, email: inviteEmail }]);
    setInviteName("");
    setInviteEmail("");
  }

  async function create() {
    if (!user || !profile || name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const now = Date.now();
      const leadMember: CrewMember = { userId: user.uid, name: profile.displayName, email: profile.email.toLowerCase(), status: "accepted", invitedAt: now };
      const inviteMembers: CrewMember[] = invites.map((i) => ({ name: i.name, email: i.email.toLowerCase(), status: "invited", invitedAt: now }));
      const members = [leadMember, ...inviteMembers];
      await addDoc(collection(db, COLLECTIONS.huntCrews), {
        name,
        leadUserId: user.uid,
        members,
        memberUids: [user.uid],
        memberEmails: members.map((m) => m.email),
        locked: false,
        points: 0,
        missionsCompleted: [],
        createdAt: now,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create your crew.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Start your crew</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>Step {step} of 3 · up to 4 people total, no changes once the Hunt begins.</div>

      {step === 1 && (
        <>
          <div style={{ fontSize: 13.5, marginBottom: 14 }}>
            You'll be the crew lead, <strong>{profile?.displayName}</strong>. You can invite up to 3 more people — anyone
            with an Umoja account, by email. No one can be part of two crews at once.
          </div>
          <PrimaryButton onClick={() => setStep(2)} style={{ width: "100%" }}>ACCEPT & START MY CREW</PrimaryButton>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Invite crew members ({invites.length}/3)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {invites.map((i) => (
              <div key={i.email} style={{ display: "flex", justifyContent: "space-between", background: "#F7F6F3", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                <span>{i.name} · {i.email}</span>
                <button onClick={() => setInvites((l) => l.filter((x) => x.email !== i.email))} style={{ background: "none", border: "none", color: theme.color.danger }}>✕</button>
              </div>
            ))}
          </div>
          {invites.length < MAX_MEMBERS - 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <input placeholder="Name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${theme.color.border}`, fontSize: 13 }} />
              <input placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${theme.color.border}`, fontSize: 13 }} />
              <button onClick={addInvite} style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", fontWeight: 700 }}>Add</button>
            </div>
          )}
          <PrimaryButton onClick={() => setStep(3)} style={{ width: "100%" }}>NEXT — NAME YOUR CREW</PrimaryButton>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Crew name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Adebayo Family"
            style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 14, fontSize: 13.5 }}
          />
          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <PrimaryButton disabled={name.trim().length < 2 || busy} onClick={create} style={{ width: "100%" }}>
            {busy ? "Creating…" : "CREATE CREW & JOIN THE HUNT"}
          </PrimaryButton>
        </>
      )}
    </Card>
  );
}
