import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { COLLECTIONS, type HuntCrew } from "@umoja/shared";
import { db } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthProvider";
import { theme } from "../../lib/theme";
import { useMyInvites } from "../../hooks/useData";
import { Card, PrimaryButton } from "../../components/ui";

export function InvitesBanner() {
  const { user, profile } = useAuth();
  const { data: crews } = useMyInvites(profile?.email);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const pending = crews.filter((c) => {
    const m = c.members.find((mm) => mm.email === profile?.email.toLowerCase());
    return m?.status === "invited" && !c.locked;
  });

  async function respond(crew: HuntCrew, accept: boolean) {
    if (!user || !profile) return;
    setBusyId(crew.id);
    setErrorId(null);
    const members = crew.members.map((m) =>
      m.email === profile.email.toLowerCase() ? { ...m, status: accept ? "accepted" : "declined", userId: accept ? user.uid : m.userId } : m
    );
    try {
      await updateDoc(doc(db, COLLECTIONS.huntCrews, crew.id), {
        members,
        ...(accept ? { memberUids: arrayUnion(user.uid) } : {}),
      });
    } catch {
      // This used to fail silently (a Firestore rules denial with no
      // try/catch) — ACCEPT looked like it did nothing at all.
      setErrorId(crew.id);
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
      {pending.map((c) => (
        <Card key={c.id} style={{ background: theme.color.warningBg, border: "none" }}>
          <div style={{ fontWeight: 700 }}>You're invited to join "{c.name}"</div>
          {errorId === c.id && (
            <div style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 6 }}>Couldn't respond to this invite — please try again.</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <PrimaryButton disabled={busyId === c.id} onClick={() => respond(c, true)}>ACCEPT</PrimaryButton>
            <button disabled={busyId === c.id} onClick={() => respond(c, false)} style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "10px 16px", fontWeight: 700 }}>Decline</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
