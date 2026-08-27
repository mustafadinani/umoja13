import { HttpsError } from "firebase-functions/v2/https";

export interface ChannelAttachmentInput {
  mediaUrl?: string;
  mediaType?: "photo" | "video";
}

export interface ValidatedMessageContent {
  text: string;
  mediaUrl?: string;
  mediaType?: "photo" | "video";
}

/**
 * Shared by every send*Message callable: a message needs text, an
 * attachment, or both — never neither. The client uploads the attachment to
 * Storage and passes back the resulting download URL; this only validates
 * shape (a plausible URL, a known media type), it can't re-check the file
 * itself since it never touches the bytes.
 */
export function validateMessageContent(text: string | undefined, attachment: ChannelAttachmentInput): ValidatedMessageContent {
  const trimmed = text?.trim() ?? "";
  const { mediaUrl, mediaType } = attachment;
  if (!trimmed && !mediaUrl) {
    throw new HttpsError("invalid-argument", "Message text or an attachment is required.");
  }
  if (mediaUrl !== undefined) {
    if (typeof mediaUrl !== "string" || !mediaUrl.startsWith("https://")) {
      throw new HttpsError("invalid-argument", "Invalid attachment URL.");
    }
    if (mediaType !== "photo" && mediaType !== "video") {
      throw new HttpsError("invalid-argument", "Invalid attachment type.");
    }
    return { text: trimmed, mediaUrl, mediaType };
  }
  return { text: trimmed };
}

/** Push/in-app notification body for a message — falls back to a media-only description when there's no caption text, so a photo/video-only message doesn't notify with a blank body. */
export function notificationBodyFor(content: Pick<ValidatedMessageContent, "text" | "mediaType">): string {
  if (content.text) return content.text;
  return content.mediaType === "video" ? "🎥 Sent a video" : "📷 Sent a photo";
}
