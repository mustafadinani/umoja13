import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS, MOMENT_TAGS, type MomentSource } from "@umoja/shared";
import { storage, db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton, Pill } from "./ui";

export function MomentUploadModal({
  onClose,
  gameId,
  source = "community",
}: {
  onClose: () => void;
  gameId?: string;
  source?: MomentSource;
}) {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  function onPick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!file || !tag || !user || !profile) return;
    setPosting(true);
    try {
      const isVideo = file.type.startsWith("video");
      const path = `moments/${user.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const mediaUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, COLLECTIONS.moments), {
        mediaType: isVideo ? "video" : "photo",
        mediaUrl,
        caption: tag,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        postedBy: user.uid,
        postedByName: profile.displayName,
        source,
        gameId: gameId ?? null,
        likeUids: [],
        moderationStatus: "pending",
        createdAt: Date.now(),
      });
      setPosted(true);
    } finally {
      setPosting(false);
    }
  }

  if (posted) {
    return (
      <Modal onClose={onClose}>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Moment posted!</div>
          <div style={{ color: theme.color.textMuted, fontSize: 14, marginTop: 6 }}>
            A moderator will take a quick look, then it goes live on the wall.
          </div>
          <PrimaryButton style={{ marginTop: 18 }} onClick={onClose}>DONE</PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Share a moment</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>Take a photo/video or choose one from your library.</div>

      <label style={{ display: "block", border: `2px dashed ${theme.color.border}`, borderRadius: theme.radius.md, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 16 }}>
        <input
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          file?.type.startsWith("video") ? (
            <video src={preview} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }} controls />
          ) : (
            <img src={preview} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }} alt="preview" />
          )
        ) : (
          <div style={{ color: theme.color.textMuted, fontSize: 14 }}>📷 Take a photo/video or choose from your library</div>
        )}
      </label>

      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>What kind of moment?</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {MOMENT_TAGS.map((t) => (
          <Pill key={t} active={tag === t} onClick={() => setTag(t)}>{t}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Add a comment (optional)</div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Say something about this moment…"
        rows={2}
        style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 20 }}
      />

      <PrimaryButton disabled={!file || !tag || posting} onClick={submit} style={{ width: "100%" }}>
        {posting ? "Posting…" : "POST MOMENT"}
      </PrimaryButton>
    </Modal>
  );
}
