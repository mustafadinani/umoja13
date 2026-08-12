import { useState } from "react";
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";
import { COLLECTIONS, MOMENT_COMMENT_MAX_LENGTH, MOMENT_TAGS, parseMomentEmbedUrl, type MomentSource } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useTeams } from "../hooks/useData";
import { Modal, Pill, PrimaryButton } from "./ui";
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
  const [uri, setUri] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [teamTagIds, setTeamTagIds] = useState<string[]>(initialTeamTagIds);
  const [playerTagUids, setPlayerTagUids] = useState<string[]>(initialPlayerTagUids);
  const [pickerOpen, setPickerOpen] = useState<"team" | "player" | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const taggedTeams = teams.filter((t) => teamTagIds.includes(t.id));
  // playerKey (never the bare userId) — two siblings sharing one family
  // account otherwise collapse into a single, ambiguous tag target.
  const rosterPool = (teamTagIds.length > 0 ? taggedTeams : teams).flatMap((t) =>
    t.roster.map((p) => ({ id: p.playerKey ?? p.userId, label: p.displayName, sublabel: t.name }))
  );
  const taggedPlayers = rosterPool.filter((p) => playerTagUids.includes(p.id));

  async function pickImage(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
      setLinkUrl(""); // a moment is either an upload or a link, never both
    }
  }

  function onLinkChange(v: string) {
    setLinkUrl(v);
    if (v.trim()) setUri(null);
  }

  const trimmedLink = linkUrl.trim();
  const parsedEmbed = trimmedLink ? parseMomentEmbedUrl(trimmedLink) : null;
  const linkInvalid = trimmedLink.length > 0 && !parsedEmbed;

  function removeTeam(id: string) {
    const remaining = teamTagIds.filter((x) => x !== id);
    setTeamTagIds(remaining);
    if (remaining.length === 0) return;
    const remainingUids = new Set(teams.filter((t) => remaining.includes(t.id)).flatMap((t) => t.roster.map((p) => p.playerKey ?? p.userId)));
    setPlayerTagUids((prev) => prev.filter((p) => remainingUids.has(p)));
  }

  async function post() {
    if (!tag || !user || (!uri && !parsedEmbed)) return;
    setPosting(true);
    setError(null);
    try {
      let mediaType: "photo" | "video" | "embed";
      let mediaUrl: string;
      if (parsedEmbed) {
        mediaType = "embed";
        mediaUrl = parsedEmbed.embedUrl;
      } else {
        const response = await fetch(uri!);
        const blob = await response.blob();
        const isVideo = uri!.endsWith(".mov") || uri!.endsWith(".mp4");
        const path = `moments/${user.uid}/${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob, { contentType: isVideo ? "video/mp4" : "image/jpeg" });
        mediaUrl = await getDownloadURL(storageRef);
        mediaType = isVideo ? "video" : "photo";
      }
      await addDoc(collection(db, COLLECTIONS.moments), {
        mediaType,
        mediaUrl,
        caption: tag,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        postedBy: user.uid,
        postedByName: user.displayName ?? "Fan",
        source,
        gameId: gameId ?? null,
        ...(teamTagIds.length > 0 ? { teamTagIds } : {}),
        ...(playerTagUids.length > 0 ? { playerTagUids } : {}),
        likeUids: [],
        moderationStatus: "pending",
        createdAt: Date.now(),
      });
      setPosted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post your moment.");
    } finally {
      setPosting(false);
    }
  }

  if (posted) {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Moment posted!</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, textAlign: "center" }}>
            A moderator will take a quick look, then it goes live on the wall.
          </Text>
          <PrimaryButton style={{ marginTop: 18, width: "100%" }} onPress={onClose}>DONE</PrimaryButton>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 10 }}>Share a moment</Text>
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: 180, borderRadius: 8, marginBottom: 12 }} />
      ) : (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, opacity: trimmedLink ? 0.5 : 1 }}>
          <PrimaryButton onPress={() => pickImage(true)} disabled={!!trimmedLink} style={{ flex: 1 }}>📷 Camera</PrimaryButton>
          <PrimaryButton onPress={() => pickImage(false)} disabled={!!trimmedLink} style={{ flex: 1 }}>🖼 Library</PrimaryButton>
        </View>
      )}

      {isStaff && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.color.border }} />
            <Text style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, color: theme.color.textMuted }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.color.border }} />
          </View>
          <View style={[styles.linkBlock, uri ? { opacity: 0.5 } : null]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700" }}>🔗 Paste a video link</Text>
              <View style={styles.staffChip}>
                <Text style={{ fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6, color: "#fff" }}>STAFF ONLY</Text>
              </View>
            </View>
            <TextInput
              value={linkUrl}
              onChangeText={onLinkChange}
              editable={!uri}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="youtube.com/watch?v=... or vimeo.com/..."
              style={styles.linkInput}
            />
            <Text style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 7, lineHeight: 15 }}>
              Works with YouTube and Vimeo — full matches, the documentary series, highlight reels.
            </Text>
            {linkInvalid && (
              <Text style={{ fontSize: 11.5, color: theme.color.danger, marginTop: 6, fontWeight: "600" }}>
                Only YouTube and Vimeo links are supported.
              </Text>
            )}
            {parsedEmbed && (
              <View style={styles.linkPreview}>
                <View style={styles.linkPreviewCheck}>
                  <Text style={{ color: "#fff", fontSize: 11 }}>✓</Text>
                </View>
                <Text style={{ fontSize: 11.5, fontWeight: "600" }}>
                  {parsedEmbed.platform === "youtube" ? "YouTube" : "Vimeo"} link recognized
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {MOMENT_TAGS.map((t) => <Pill key={t} active={tag === t} onPress={() => setTag(t)}>{t}</Pill>)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ fontWeight: "700", fontSize: 13 }}>Add a comment (optional)</Text>
        <TouchableOpacity onPress={() => Keyboard.dismiss()}>
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: theme.color.purple }}>Done</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        value={comment}
        onChangeText={(t) => setComment(t.slice(0, MOMENT_COMMENT_MAX_LENGTH))}
        placeholder="Say something about this moment…"
        multiline
        numberOfLines={2}
        maxLength={MOMENT_COMMENT_MAX_LENGTH}
        style={styles.commentInput}
      />
      <Text style={{ fontSize: 11.5, color: comment.length >= MOMENT_COMMENT_MAX_LENGTH ? theme.color.danger : theme.color.textMuted, textAlign: "right", marginTop: -10, marginBottom: 4 }}>
        {comment.length}/{MOMENT_COMMENT_MAX_LENGTH}
      </Text>

      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 6 }}>Tag people (optional)</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
        <TouchableOpacity onPress={() => setPickerOpen("team")} style={styles.tagButton}>
          <Text style={{ fontWeight: "700", fontSize: 13 }}>
            🏷 Tag a team{teamTagIds.length > 0 ? ` (${teamTagIds.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPickerOpen("player")} style={styles.tagButton}>
          <Text style={{ fontWeight: "700", fontSize: 13 }}>
            🏷 Tag a player{playerTagUids.length > 0 ? ` (${playerTagUids.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {(taggedTeams.length > 0 || taggedPlayers.length > 0) && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {taggedTeams.map((t) => (
            <View key={t.id} style={styles.chip}>
              <Text style={{ fontSize: 12.5, fontWeight: "600" }}>{t.name}</Text>
              <Text onPress={() => removeTeam(t.id)} style={{ color: theme.color.textMuted }}> ✕</Text>
            </View>
          ))}
          {taggedPlayers.map((p) => (
            <View key={p.id} style={[styles.chip, { backgroundColor: "#F7F0FF" }]}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: theme.color.purple }}>{p.label}</Text>
              <Text onPress={() => setPlayerTagUids((prev) => prev.filter((x) => x !== p.id))} style={{ color: theme.color.purple }}> ✕</Text>
            </View>
          ))}
        </View>
      )}

      {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</Text>}
      <PrimaryButton disabled={(!uri && !parsedEmbed) || !tag || posting} onPress={post} style={{ width: "100%" }}>
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

const styles = StyleSheet.create({
  commentInput: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 50, textAlignVertical: "top", marginBottom: 14 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1EFF5", borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  tagButton: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm, paddingVertical: 11, alignItems: "center", backgroundColor: "#fff" },
  linkBlock: { borderWidth: 1.5, borderColor: theme.color.purpleLight, backgroundColor: "#F7F0FF", borderRadius: theme.radius.md, padding: 12, marginBottom: 16 },
  staffChip: { backgroundColor: theme.color.navy, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  linkInput: { borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm, padding: 10, fontSize: 12.5, backgroundColor: "#fff" },
  linkPreview: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9, padding: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm },
  linkPreviewCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.color.success, alignItems: "center", justifyContent: "center" },
});
