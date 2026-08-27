import { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { pickAndUploadChannelAttachment, type ChannelAttachment } from "../lib/uploadChannelAttachment";

/**
 * A 📎 button that opens the media picker, uploads the result, and hands the
 * resulting {mediaUrl, mediaType} back to the caller, plus a small preview/
 * remove chip once something's attached. Shared by every chat compose bar
 * (Pod/Team/Role/User channels) so the upload + preview logic lives in one
 * place.
 */
export function ChannelAttachButton({
  value,
  onChange,
  disabled,
}: {
  value: ChannelAttachment | null;
  onChange: (attachment: ChannelAttachment | null) => void;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    if (!user) return;
    setUploading(true);
    setError(null);
    try {
      const attachment = await pickAndUploadChannelAttachment(user.uid);
      if (attachment) onChange(attachment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't attach that file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View>
      {value && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Image source={{ uri: value.mediaUrl }} style={styles.preview} />
          <Text onPress={() => onChange(null)} style={{ color: theme.color.textMuted, fontSize: 12 }}>✕ Remove</Text>
        </View>
      )}
      {error && <Text style={{ color: theme.color.danger, fontSize: 11.5, marginBottom: 4 }}>{error}</Text>}
      <TouchableOpacity onPress={pick} disabled={disabled || uploading} style={[styles.button, (disabled || uploading) && { opacity: 0.5 }]}>
        <Text style={{ fontSize: 16 }}>{uploading ? "…" : "📎"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: theme.color.border, alignItems: "center", justifyContent: "center" },
  preview: { width: 44, height: 44, borderRadius: 8 },
});
