import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { submitGameCard } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export function SubmitGameCardModal({ gameId, onClose, onSubmitted }: { gameId: string; onClose: () => void; onSubmitted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"capture" | "uploading" | "done">("capture");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setStep("uploading");
    setError(null);
    try {
      const path = `gameCards/${gameId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);
      await submitGameCard({ gameId, photoUrl });
      setStep("done");
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit the game card.");
      setStep("capture");
    }
  }

  if (step === "done") {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Sent to Commissioner</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            The result is provisional until they call it final.
          </div>
          <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  if (step === "uploading") {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div className="um-spin" style={{ width: 40, height: 40, border: `4px solid ${theme.color.border}`, borderTopColor: theme.color.purple, borderRadius: "50%", margin: "0 auto 16px" }} />
          <div style={{ fontWeight: 700 }}>Uploading…</div>
        </div>
      </Modal>
    );
  }

  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Submit game card</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 14 }}>Photograph the paper match card.</div>
      <label style={{ display: "block", border: `2px dashed ${theme.color.border}`, borderRadius: theme.radius.md, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 16 }}>
        <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {preview ? <img src={preview} alt="card" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8 }} /> : <div style={{ color: theme.color.textMuted }}>📷 Tap to capture the card</div>}
      </label>
      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <PrimaryButton disabled={!file} onClick={submit} style={{ width: "100%" }}>CAPTURE & SEND TO COMMISSIONER</PrimaryButton>
    </Modal>
  );
}
