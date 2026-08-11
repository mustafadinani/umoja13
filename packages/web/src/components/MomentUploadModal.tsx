import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS, MOMENT_TAGS, parseMomentEmbedUrl, type MomentSource } from "@umoja/shared";
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
  const isStaff = profile?.roles.some((r) => r === "admin" || r === "commissioner") ?? false;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [teamTagIds, setTeamTagIds] = useState<string[]>(initialTeamTagIds);
  const [playerTagUids, setPlayerTagUids] = useState<string[]>(initialPlayerTagUids);
  const [pickerOpen, setPickerOpen] = useState<"team" | "player" | null>(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const taggedTeams = teams.filter((t) => teamTagIds.includes(t.id));
  // playerKey (never the bare userId) — two siblings sharing one family
  // account otherwise collapse into a single, ambiguous tag target.
  const rosterPool = (teamTagIds.length > 0 ? taggedTeams : teams).flatMap((t) =>
    t.roster.map((p) => ({ id: p.playerKey ?? p.userId, label: p.displayName, sublabel: t.name }))
  );
  const taggedPlayers = rosterPool.filter((p) => playerTagUids.includes(p.id));

  function onPick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f) setLinkUrl(""); // a moment is either an upload or a link, never both
  }

  function onLinkChange(v: string) {
    setLinkUrl(v);
    if (v.trim()) {
      setFile(null);
      setPreview(null);
    }
  }

  const trimmedLink = linkUrl.trim();
  const parsedEmbed = trimmedLink ? parseMomentEmbedUrl(trimmedLink) : null;
  const linkInvalid = trimmedLink.length > 0 && !parsedEmbed;

  function removeTeam(id: string) {
    setTeamTagIds((prev) => prev.filter((x) => x !== id));
    // Selected players from a team that's no longer tagged would silently
    // stay tagged with no visible way to remove them once the roster pool
    // narrows back down — drop them along with the team.
    const remainingIds = new Set(teams.filter((t) => t.id !== id && teamTagIds.includes(t.id)).flatMap((t) => t.roster.map((p) => p.playerKey ?? p.userId)));
    setPlayerTagUids((prev) => (teamTagIds.length <= 1 ? prev : prev.filter((p) => remainingIds.has(p))));
  }

  async function submit() {
    if (!tag || !user || !profile || (!file && !parsedEmbed)) return;
    setPosting(true);
    try {
      let mediaType: "photo" | "video" | "embed";
      let mediaUrl: string;
      if (parsedEmbed) {
        mediaType = "embed";
        mediaUrl = parsedEmbed.embedUrl;
      } else {
        const isVideo = file!.type.startsWith("video");
        const path = `moments/${user.uid}/${Date.now()}-${file!.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file!);
        mediaUrl = await getDownloadURL(storageRef);
        mediaType = isVideo ? "video" : "photo";
      }

      await addDoc(collection(db, COLLECTIONS.moments), {
        mediaType,
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

      <label
        style={{
          display: "block",
          border: `2px dashed ${theme.color.border}`,
          borderRadius: theme.radius.md,
          padding: 20,
          textAlign: "center",
          cursor: trimmedLink ? "not-allowed" : "pointer",
          marginBottom: 16,
          opacity: trimmedLink ? 0.5 : 1,
        }}
      >
        <input
          type="file"
          accept="image/*,video/*"
          disabled={!!trimmedLink}
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

      {isStaff && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px" }}>
            <div style={{ flex: 1, height: 1, background: theme.color.border }} />
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: theme.color.textMuted }}>OR</div>
            <div style={{ flex: 1, height: 1, background: theme.color.border }} />
          </div>

          <div
            style={{
              border: `1.5px solid ${theme.color.purpleLight}`,
              background: "#F7F0FF",
              borderRadius: theme.radius.md,
              padding: 12,
              marginBottom: 16,
              opacity: file ? 0.5 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>🔗 Paste a video link</div>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, color: "#fff", background: theme.color.navy, borderRadius: 999, padding: "3px 8px" }}>
                STAFF ONLY
              </div>
            </div>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => onLinkChange(e.target.value)}
              disabled={!!file}
              placeholder="youtube.com/watch?v=... or vimeo.com/..."
              style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "9px 10px", fontSize: 12.5, fontFamily: "inherit" }}
            />
            <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 7, lineHeight: 1.4 }}>
              Works with YouTube and Vimeo — full matches, the documentary series, highlight reels.
            </div>
            {linkInvalid && (
              <div style={{ fontSize: 11.5, color: theme.color.danger, marginTop: 6, fontWeight: 600 }}>
                Only YouTube and Vimeo links are supported.
              </div>
            )}
            {parsedEmbed && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, padding: "7px 8px", background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: theme.color.success, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</div>
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>{parsedEmbed.platform === "youtube" ? "YouTube" : "Vimeo"} link recognized</div>
              </div>
            )}
          </div>
        </>
      )}

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

      <PrimaryButton disabled={(!file && !parsedEmbed) || !tag || posting} onClick={submit} style={{ width: "100%" }}>
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
