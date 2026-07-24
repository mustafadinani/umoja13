import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS, type Challenge, type ChallengeSubmission, type HuntCrew } from "@umoja/shared";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthProvider";
import { theme } from "../../lib/theme";
import { Modal, PrimaryButton } from "../../components/ui";
import { Lightbox } from "../../components/Lightbox";

export function ChallengeDetailModal({
  challenge,
  crew,
  mySubmission,
  onClose,
}: {
  challenge: Challenge;
  crew: HuntCrew;
  mySubmission: ChallengeSubmission | null;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);

  const done = crew.challengesCompleted?.includes(challenge.id) ?? false;

  function renderMediaPreview(src: string, mediaType: string | null | undefined) {
    if (mediaType === "video") {
      return (
        <div
          onClick={() => setLightboxSrc({ src, mediaType: "video" })}
          style={{ position: "relative", width: "100%", height: 200, borderRadius: theme.radius.sm, marginBottom: 12, overflow: "hidden", cursor: "zoom-in", background: "#000" }}
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
        style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: theme.radius.sm, marginBottom: 12, cursor: "zoom-in" }}
      />
    );
  }
  const accept = challenge.answerType === "photo_only" ? "image/*" : challenge.answerType === "video_only" ? "video/*" : "image/*,video/*";
  const now = Date.now();
  const notYetOpen = challenge.startsAt && now < challenge.startsAt;
  const closed = challenge.deadline && now > challenge.deadline;

  async function submit() {
    if (!file || !user || !profile) return;
    setBusy(true);
    setError(null);
    try {
      const isVideo = file.type.startsWith("video");
      const path = `challengeSubmissions/${challenge.id}/${user.uid}-${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const mediaUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, COLLECTIONS.challengeSubmissions), {
        challengeId: challenge.id,
        crewId: crew.id,
        submittedBy: user.uid,
        submittedByName: profile.displayName,
        mediaType: isVideo ? "video" : "photo",
        mediaUrl,
        status: "pending",
        createdAt: Date.now(),
      });
      setJustSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit this challenge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>⚡ {challenge.title}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 10 }}>+{challenge.points} pts</div>
      <div style={{ fontSize: 14, marginBottom: 16 }}>{challenge.description}</div>

      {challenge.earlyBirdBonuses.length > 0 && (
        <div style={{ background: "#FFF6DD", borderRadius: theme.radius.sm, padding: 12, fontSize: 12.5, marginBottom: 16 }}>
          🏅 Early-bird bonus for the first {challenge.earlyBirdBonuses.length} crews to submit: +{challenge.earlyBirdBonuses.join(" / +")} pts
        </div>
      )}

      {done || mySubmission?.status === "approved" ? (
        <>
          {mySubmission?.mediaUrl && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
          <div style={{ background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: 12, fontWeight: 700, textAlign: "center" }}>
            Done ✓ {mySubmission?.bonusPoints ? `— +${mySubmission.bonusPoints} early-bird bonus!` : ""}
          </div>
        </>
      ) : mySubmission?.status === "pending" || justSubmitted ? (
        <>
          {mySubmission?.mediaUrl && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
          <div style={{ background: theme.color.warningBg, color: theme.color.warning, borderRadius: theme.radius.sm, padding: 12, fontWeight: 700, textAlign: "center" }}>
            Submitted — a facilitator will take a look shortly.
          </div>
        </>
      ) : notYetOpen ? (
        <div style={{ color: theme.color.textMuted, fontSize: 13, textAlign: "center" }}>
          Opens {new Date(challenge.startsAt!).toLocaleString()}
        </div>
      ) : closed ? (
        <div style={{ color: theme.color.danger, fontSize: 13, textAlign: "center", fontWeight: 700 }}>This challenge has closed.</div>
      ) : (
        <>
          {mySubmission?.status === "rejected" && (
            <>
              {mySubmission?.mediaUrl && renderMediaPreview(mySubmission.mediaUrl, mySubmission.mediaType)}
              <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 12.5, marginBottom: 12, textAlign: "center" }}>
                Not approved — try submitting again.
              </div>
            </>
          )}
          <label style={{ display: "block", border: `2px dashed ${theme.color.border}`, borderRadius: theme.radius.md, padding: 18, textAlign: "center", cursor: "pointer", marginBottom: 14 }}>
            <input type="file" accept={accept} capture="environment" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? <div style={{ fontSize: 13 }}>{file.name}</div> : <div style={{ color: theme.color.textMuted }}>📷 Take or upload a {challenge.answerType === "video_only" ? "video" : challenge.answerType === "photo_only" ? "photo" : "photo/video"}</div>}
          </label>
          {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <PrimaryButton disabled={!file || busy} onClick={submit} style={{ width: "100%" }}>
            {busy ? "Submitting…" : "SUBMIT FOR REVIEW"}
          </PrimaryButton>
        </>
      )}
      {lightboxSrc && <Lightbox src={lightboxSrc.src} mediaType={lightboxSrc.mediaType} onClose={() => setLightboxSrc(null)} />}
    </Modal>
  );
}
