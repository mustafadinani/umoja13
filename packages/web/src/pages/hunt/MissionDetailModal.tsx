import { useState } from "react";
import { doc, updateDoc, arrayUnion, addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS, huntMissionIsAutoScored, type HuntCrew, type HuntMission, type HuntSubmission } from "@umoja/shared";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthProvider";
import { theme } from "../../lib/theme";
import { Modal, PrimaryButton, Pill } from "../../components/ui";
import { Lightbox } from "../../components/Lightbox";

export function MissionDetailModal({
  mission,
  crew,
  mySubmission,
  onClose,
}: {
  mission: HuntMission;
  crew: HuntCrew;
  mySubmission: HuntSubmission | null;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [triviaChoice, setTriviaChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState<"pending" | "correct" | "wrong" | null>(
    crew.missionsCompleted.includes(mission.id) ? "correct" : null
  );
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);

  const alreadyDone = crew.missionsCompleted.includes(mission.id);
  const autoScored = huntMissionIsAutoScored(mission.type);
  // Persisted status wins over ephemeral local state (so it survives closing/reopening the modal).
  const status = alreadyDone ? "correct" : justSubmitted ?? (mySubmission?.status === "rejected" ? "rejected" : mySubmission?.status === "pending" ? "pending" : null);

  async function completeInstant(correct: boolean) {
    setBusy(true);
    try {
      if (correct) {
        await updateDoc(doc(db, COLLECTIONS.huntCrews, crew.id), {
          points: crew.points + mission.points,
          missionsCompleted: arrayUnion(mission.id),
        });
      }
      setJustSubmitted(correct ? "correct" : "wrong");
    } finally {
      setBusy(false);
    }
  }

  function pickFile(f: File | null) {
    setFile(f);
    setFilePreview(f ? URL.createObjectURL(f) : null);
  }

  async function submitForReview() {
    if (!user || !profile) return;
    setBusy(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: "photo" | "video" | "text" | null = null;
      if (file) {
        mediaType = file.type.startsWith("video") ? "video" : "photo";
        const path = `huntSubmissions/${user.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        mediaUrl = await getDownloadURL(storageRef);
      } else if (text) {
        mediaType = "text";
      }
      await addDoc(collection(db, COLLECTIONS.huntSubmissions), {
        crewId: crew.id,
        missionId: mission.id,
        submittedBy: user.uid,
        submittedByName: profile.displayName,
        mediaType,
        mediaUrl: mediaUrl ?? null,
        textAnswer: text || null,
        status: "pending",
        createdAt: Date.now(),
      });
      setJustSubmitted("pending");
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = filePreview ?? mySubmission?.mediaUrl;

  function renderMediaPreview(src: string, mediaType: string | null | undefined) {
    if (mediaType === "video") {
      return (
        <div
          onClick={() => setLightboxSrc({ src, mediaType: "video" })}
          style={{ position: "relative", width: "100%", height: 220, borderRadius: theme.radius.sm, marginBottom: 12, overflow: "hidden", cursor: "zoom-in", background: "#000" }}
        >
          <video src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.3)", color: "#fff", fontSize: 32 }}>▶</div>
        </div>
      );
    }
    return (
      <img
        src={src}
        alt="Your submission"
        onClick={() => setLightboxSrc({ src, mediaType: "photo" })}
        style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: theme.radius.sm, marginBottom: 12, cursor: "zoom-in" }}
      />
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{mission.title}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 10 }}>{mission.subtitle} · +{mission.points} pts</div>
      <div style={{ fontSize: 14, marginBottom: 16 }}>{mission.description}</div>

      {status === "correct" && (
        <>
          {mySubmission?.mediaUrl && mySubmission.mediaType !== "text" && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
          <div style={{ background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: 12, fontWeight: 700, textAlign: "center" }}>
            Done ✓ — +{mission.points} pts earned for your crew.
          </div>
        </>
      )}
      {status === "wrong" && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 12, fontWeight: 700, textAlign: "center" }}>
          Not quite — trivia only gets one shot per crew.
        </div>
      )}
      {status === "pending" && (
        <>
          {previewUrl && mySubmission?.mediaType !== "text" && renderMediaPreview(previewUrl, mySubmission?.mediaType ?? (file ? (file.type.startsWith("video") ? "video" : "photo") : null))}
          {mySubmission?.textAnswer && (
            <div style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12, fontSize: 13.5, marginBottom: 12 }}>"{mySubmission.textAnswer}"</div>
          )}
          <div style={{ background: theme.color.warningBg, color: theme.color.warning, borderRadius: theme.radius.sm, padding: 12, fontWeight: 700, textAlign: "center" }}>
            Submitted — a facilitator will take a look shortly.
          </div>
        </>
      )}
      {status === "rejected" && (
        <>
          {mySubmission?.mediaUrl && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
          <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 12, fontWeight: 700, textAlign: "center", marginBottom: 12 }}>
            Not approved — try submitting again.
            {mySubmission?.rejectionReason && <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 6 }}>{mySubmission.rejectionReason}</div>}
          </div>
        </>
      )}

      {(status === null || status === "rejected") && (
        <>
          {mission.type === "trivia" && mission.options && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {mission.options.map((opt, i) => (
                <Pill key={i} active={triviaChoice === i} onClick={() => setTriviaChoice(i)}>{opt}</Pill>
              ))}
            </div>
          )}
          {(mission.type === "gps" || mission.type === "qr") && (
            <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14 }}>
              {mission.type === "gps" ? "📍 Walk to the location and check in." : "🔲 Scan the QR code at the station."}
            </div>
          )}
          {(mission.type === "photo" || mission.type === "video" || mission.type === "mini_game") && (
            <label style={{ display: "block", border: `2px dashed ${theme.color.border}`, borderRadius: theme.radius.md, padding: 18, textAlign: "center", cursor: "pointer", marginBottom: 14 }}>
              <input type="file" accept="image/*,video/*" capture="environment" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              {file ? <div style={{ fontSize: 13 }}>{file.name}</div> : <div style={{ color: theme.color.textMuted }}>📷 Take or upload a photo/video</div>}
            </label>
          )}
          {mission.type === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Your answer…"
              style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 14 }}
            />
          )}

          {autoScored ? (
            mission.type === "trivia" ? (
              <PrimaryButton disabled={triviaChoice === null || busy} onClick={() => completeInstant(triviaChoice === mission.answerIndex)} style={{ width: "100%" }}>
                SUBMIT ANSWER
              </PrimaryButton>
            ) : (
              <PrimaryButton disabled={busy} onClick={() => completeInstant(true)} style={{ width: "100%" }}>
                {mission.type === "gps" ? "📍 CHECK IN HERE" : "🔲 SCAN THE QR CODE"}
              </PrimaryButton>
            )
          ) : (
            <PrimaryButton disabled={(!file && !text) || busy} onClick={submitForReview} style={{ width: "100%" }}>
              {busy ? "Submitting…" : status === "rejected" ? "RESUBMIT" : "SUBMIT FOR REVIEW"}
            </PrimaryButton>
          )}
        </>
      )}
      {lightboxSrc && <Lightbox src={lightboxSrc.src} mediaType={lightboxSrc.mediaType} onClose={() => setLightboxSrc(null)} />}
    </Modal>
  );
}
