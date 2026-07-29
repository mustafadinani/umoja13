import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CATEGORIES, COLLECTIONS, type PlayerMembership } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { useTeams } from "../hooks/useData";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton, Pill } from "./ui";

/**
 * Self-serve "join a team" flow — there's no separate admin registration/
 * import system yet, so this both records the membership on the user's
 * profile and adds a roster entry on the team doc. The photo captured here
 * becomes the AI check-in baseline (registrationPhotoUrl).
 */
export function JoinTeamModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [playerName, setPlayerName] = useState(profile?.displayName ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data: teams } = useTeams(categoryId ?? undefined);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!user || !profile || !playerName.trim() || !categoryId || !teamId || !file) return;
    setBusy(true);
    setError(null);
    try {
      const path = `checkins/${user.uid}/registration/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const registrationPhotoUrl = await getDownloadURL(storageRef);

      const membership: PlayerMembership = {
        teamId,
        categoryId,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
        isCaptain: false,
        registrationPhotoUrl,
        playerName: playerName.trim(),
      };

      const nextRoles = Array.from(new Set([...(profile.roles ?? []), "player"]));
      await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
        playerOf: arrayUnion(membership),
        roles: nextRoles,
        primaryRole: "player",
        updatedAt: Date.now(),
      });

      await updateDoc(doc(db, COLLECTIONS.teams, teamId), {
        roster: arrayUnion({
          userId: user.uid,
          displayName: playerName.trim(),
          jerseyNumber: membership.jerseyNumber ?? null,
          isCaptain: false,
          goals: 0,
          assists: 0,
          checkInStatus: "not_started",
        }),
      });

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the team.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Join a team</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
        Playing in more than one category, or signing up more than one child? You'll do this once per player/category.
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Player's name</div>
      <input
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Who's actually playing?"
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 14 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Category</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {CATEGORIES.map((c) => (
          <Pill key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setTeamId(null); }}>{c.label}</Pill>
        ))}
      </div>

      {categoryId && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Team</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {teams.map((t) => (
              <Pill key={t.id} active={teamId === t.id} onClick={() => setTeamId(t.id)} bg={teamId === t.id ? t.color : undefined}>{t.name}</Pill>
            ))}
          </div>
        </>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Jersey number (optional)</div>
      <input
        type="number"
        value={jerseyNumber}
        onChange={(e) => setJerseyNumber(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 14 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Registration photo</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 8 }}>
        Your check-in selfie will be matched against this photo later.
      </div>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ marginBottom: 16 }} />

      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <PrimaryButton disabled={!playerName.trim() || !categoryId || !teamId || !file || busy} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Joining…" : "JOIN TEAM"}
      </PrimaryButton>
    </Modal>
  );
}
