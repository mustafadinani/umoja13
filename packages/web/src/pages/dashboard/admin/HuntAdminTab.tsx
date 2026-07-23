import { useState } from "react";
import { addDoc, collection, doc, deleteDoc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { COLLECTIONS, type HuntMissionType } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useHuntCrews, useHuntMissions, useHuntSubmissions } from "../../../hooks/useData";
import { useAuth } from "../../../auth/AuthProvider";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { Lightbox } from "../../../components/Lightbox";
import { ChallengesAdminTab } from "./ChallengesAdminTab";

const TYPES: { id: HuntMissionType; label: string }[] = [
  { id: "photo", label: "📸 Photo" },
  { id: "video", label: "🎥 Video" },
  { id: "trivia", label: "🧠 Trivia" },
  { id: "gps", label: "📍 GPS" },
  { id: "qr", label: "🔲 QR" },
  { id: "text", label: "💬 Text" },
  { id: "mini_game", label: "🎮 Mini-game" },
];

const DAYS: { id: "1" | "2" | "3" | "open"; label: string }[] = [
  { id: "1", label: "Day 1" },
  { id: "2", label: "Day 2" },
  { id: "3", label: "Day 3" },
  { id: "open", label: "Open (all days)" },
];

export function HuntAdminTab() {
  const { user } = useAuth();
  const { data: missions } = useHuntMissions();
  const { data: crews } = useHuntCrews();
  const { data: pendingSubmissions } = useHuntSubmissions([where("status", "==", "pending")]);
  const [type, setType] = useState<HuntMissionType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState<"1" | "2" | "3" | "open">("open");
  const [points, setPoints] = useState(75);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<"missions" | "challenges">("missions");
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);

  async function reviewSubmission(submissionId: string, crewId: string, missionId: string, approve: boolean) {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.huntSubmissions, submissionId), {
      status: approve ? "approved" : "rejected",
      reviewedBy: user.uid,
    });
    if (approve) {
      const mission = missions.find((m) => m.id === missionId);
      const crew = crews.find((c) => c.id === crewId);
      if (mission && crew && !crew.missionsCompleted.includes(missionId)) {
        await updateDoc(doc(db, COLLECTIONS.huntCrews, crewId), {
          points: crew.points + mission.points,
          missionsCompleted: arrayUnion(missionId),
        });
      }
    }
  }

  async function addMission() {
    if (!type || !title.trim()) return;
    setBusy(true);
    try {
      await addDoc(collection(db, COLLECTIONS.huntMissions), {
        type, title, subtitle: day === "open" ? "Open mission" : `Day ${day}`, description, points, day,
      });
      setTitle("");
      setDescription("");
      setType(null);
      setPoints(75);
    } finally {
      setBusy(false);
    }
  }

  async function removeMission(id: string) {
    await deleteDoc(doc(db, COLLECTIONS.huntMissions, id));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill active={section === "missions"} onClick={() => setSection("missions")}>Missions</Pill>
        <Pill active={section === "challenges"} onClick={() => setSection("challenges")}>Challenges</Pill>
      </div>

      {section === "challenges" ? <ChallengesAdminTab /> : (
      <>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>SUBMISSIONS TO REVIEW ({pendingSubmissions.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {pendingSubmissions.map((s) => {
          const mission = missions.find((m) => m.id === s.missionId);
          const crew = crews.find((c) => c.id === s.crewId);
          return (
            <Card key={s.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              {s.mediaUrl && (
                <div
                  onClick={() => setLightbox({ src: s.mediaUrl!, mediaType: s.mediaType === "video" ? "video" : "photo" })}
                  style={{ width: 60, height: 44, borderRadius: 6, background: `url(${s.mediaUrl}) center/cover`, cursor: "zoom-in", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{mission?.title ?? s.missionId}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted }}>
                  {crew?.name ?? s.crewId} · {s.submittedByName} {s.textAnswer && `· "${s.textAnswer}"`}
                </div>
              </div>
              <button onClick={() => reviewSubmission(s.id, s.crewId, s.missionId, true)} style={{ background: theme.color.successBg, color: theme.color.success, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>Approve</button>
              <button onClick={() => reviewSubmission(s.id, s.crewId, s.missionId, false)} style={{ background: theme.color.dangerBg, color: theme.color.danger, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>Reject</button>
            </Card>
          );
        })}
        {pendingSubmissions.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Nothing waiting for review.</div>}
      </div>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>ADD A MISSION</div>
      <Card style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {TYPES.map((t) => <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.label}</Pill>)}
        </div>
        <input
          placeholder="Mission title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5 }}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5, resize: "none" }}
        />
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {DAYS.map((d) => <Pill key={d.id} active={day === d.id} onClick={() => setDay(d.id)}>{d.label}</Pill>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Points</span>
          <button onClick={() => setPoints((p) => Math.max(25, p - 25))} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "#fff" }}>−</button>
          <span style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16 }}>{points}</span>
          <button onClick={() => setPoints((p) => p + 25)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "#fff" }}>+</button>
        </div>
        <PrimaryButton disabled={!type || !title.trim() || busy} onClick={addMission}>{busy ? "Adding…" : "ADD MISSION"}</PrimaryButton>
      </Card>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MISSION LIBRARY ({missions.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {missions.map((m) => (
          <Card key={m.id} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{TYPES.find((t) => t.id === m.type)?.label} {m.title}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted }}>{m.subtitle} · {m.points} pts</div>
            </div>
            <button onClick={() => removeMission(m.id)} style={{ background: "none", border: "none", color: theme.color.danger, fontSize: 12, fontWeight: 700 }}>Remove</button>
          </Card>
        ))}
      </div>
      </>
      )}
      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
    </div>
  );
}
