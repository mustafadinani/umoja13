import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS, MOMENT_TAGS, type MomentSource } from "@umoja/shared";
import { storage, db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useTeams } from "../hooks/useData";
import { Modal, PrimaryButton, Pill } from "./ui";
import { TagPickerDrawer } from "./TagPickerDrawer";

export function MomentUploadModal({
  onClose,
  gameId,
  source = "community",
  initialTeamTagIds = [],
  initialPlayerTagUids = [],
}: {
  onClose: () => void;
  gameId?: string;
  source?: MomentSource;
  initialTeamTagIds?: string[];
  initialPlayerTagUids?: string[];
}) {
  const { user, profile } = useAuth();
  const { data: teams } = useTeams();
  const { data: categories } = useCategories();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [teamTagIds, setTeamTagIds] = useState<string[]>(initialTeamTagIds);
  const [playerTagUids, setPlayerTagUids] = useState<string[]>(initialPlayerTagUids);
  const [pickerOpen, setPickerOpen] = useState<"team" | "player" | null>(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const taggedTeams = teams.filter((t) => teamTagIds.includes(t.id));
  const rosterPool = (teamTagIds.length > 0 ? taggedTeams : teams).flatMap((t) =>
    t.roster.map((p) => ({ id: p.userId, label: p.displayName, sublabel: t.name }))
  );
  const taggedPlayers = rosterPool.filter((p) => playerTagUids.includes(p.id));

  function onPick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function removeTeam(id: string) {
    setTeamTagIds((prev) => prev.filter((x) => x !== id));
    // Selected players from a team that's no longer tagged would silently
    // stay tagged with no visible way to remove them once the roster pool
    // narrows back down — drop them along with the team.
    const remainingIds = new Set(teams.filter((t) => t.id !== id && teamTagIds.includes(t.id)).flatMap((t) => t.roster.map((p) => p.userId)));
    setPlayerTagUids((prev) => (teamTagIds.length <= 1 ? prev : prev.filter((p) => remainingIds.has(p))));
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
        ...(teamTagIds.length > 0 ? { teamTagIds } : {}),
        ...(playerTagUids.length > 0 ? { playerTagUids } : {}),
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
        style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, resize: "none", marginBottom: 16 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Tag people (optional)</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          onClick={() => setPickerOpen("team")}
          type="button"
          style={{ flex: 1, padding: "10px 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          🏷 Tag a team{teamTagIds.length > 0 ? ` (${teamTagIds.length})` : ""}
        </button>
        <button
          onClick={() => setPickerOpen("player")}
          type="button"
          style={{ flex: 1, padding: "10px 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, background: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          🏷 Tag a player{playerTagUids.length > 0 ? ` (${playerTagUids.length})` : ""}
        </button>
      </div>

      {(taggedTeams.length > 0 || taggedPlayers.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {taggedTeams.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F1EFF5", borderRadius: 999, padding: "5px 10px", fontSize: 12.5, fontWeight: 600 }}>
              {t.name}
              <span onClick={() => removeTeam(t.id)} style={{ cursor: "pointer", color: theme.color.textMuted }}>✕</span>
            </div>
          ))}
          {taggedPlayers.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F7F0FF", borderRadius: 999, padding: "5px 10px", fontSize: 12.5, fontWeight: 600, color: theme.color.purple }}>
              {p.label}
              <span onClick={() => setPlayerTagUids((prev) => prev.filter((x) => x !== p.id))} style={{ cursor: "pointer" }}>✕</span>
            </div>
          ))}
        </div>
      )}

      <PrimaryButton disabled={!file || !tag || posting} onClick={submit} style={{ width: "100%" }}>
        {posting ? "Posting…" : "POST MOMENT"}
      </PrimaryButton>

      {pickerOpen === "team" && (
        <TagPickerDrawer
          title="Tag a team"
          items={teams.map((t) => ({ id: t.id, label: t.name, sublabel: categories.find((c) => c.id === t.categoryId)?.label, groupId: t.categoryId }))}
          groups={categories.map((c) => ({ id: c.id, label: c.label }))}
          selected={teamTagIds}
          onConfirm={(ids) => { setTeamTagIds(ids); setPickerOpen(null); }}
          onClose={() => setPickerOpen(null)}
        />
      )}
      {pickerOpen === "player" && (
        <TagPickerDrawer
          title="Tag a player"
          items={rosterPool}
          selected={playerTagUids}
          onConfirm={(ids) => { setPlayerTagUids(ids); setPickerOpen(null); }}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </Modal>
  );
}
