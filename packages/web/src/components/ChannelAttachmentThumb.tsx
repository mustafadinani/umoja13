/** A message bubble's inline photo/video thumbnail — tap to open in the Lightbox. Shared by every chat panel that renders attachments. */
export function ChannelAttachmentThumb({
  mediaUrl,
  mediaType,
  onClick,
}: {
  mediaUrl: string;
  mediaType: "photo" | "video";
  onClick: () => void;
}) {
  const style: React.CSSProperties = { maxWidth: 220, maxHeight: 220, borderRadius: 8, display: "block", cursor: "pointer", objectFit: "cover" };
  return mediaType === "video" ? (
    <video src={mediaUrl} muted style={style} onClick={onClick} />
  ) : (
    <img src={mediaUrl} style={style} onClick={onClick} alt="Attachment" />
  );
}
