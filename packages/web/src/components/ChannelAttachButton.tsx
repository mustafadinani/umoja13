import { useRef, useState } from "react";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { uploadChannelAttachment, type ChannelAttachment } from "../lib/uploadChannelAttachment";

/**
 * A 📎 icon that uploads the picked photo/video and hands the resulting
 * {mediaUrl, mediaType} back to the caller, plus a small preview/remove chip
 * once something's attached. Shared by every chat compose bar (Pod/Team/
 * Role/User channels) so the upload + preview logic lives in one place.
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
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File | null) {
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadChannelAttachment(file, user.uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't attach that file.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {value && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {value.mediaType === "video" ? (
            <video src={value.mediaUrl} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} muted />
          ) : (
            <img src={value.mediaUrl} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} alt="Attachment preview" />
          )}
          <span onClick={() => onChange(null)} style={{ cursor: "pointer", color: theme.color.textMuted, fontSize: 12 }}>✕ Remove</span>
        </div>
      )}
      {error && <div style={{ color: theme.color.danger, fontSize: 11.5, marginBottom: 4 }}>{error}</div>}
      <label
        title="Attach a photo or video"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: theme.radius.sm,
          border: `1px solid ${theme.color.border}`,
          fontSize: 16,
          cursor: disabled || uploading ? "default" : "pointer",
          opacity: disabled || uploading ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          disabled={disabled || uploading}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {uploading ? "…" : "📎"}
      </label>
    </div>
  );
}
