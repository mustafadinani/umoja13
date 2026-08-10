import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export interface ChannelAttachment {
  mediaUrl: string;
  mediaType: "photo" | "video";
}

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

/** Uploads a picked file to the shared chat-attachment Storage path and returns its download URL — same upload-then-get-URL shape as Moments, just a different path (see storage.rules `channelAttachments/{uid}`). */
export async function uploadChannelAttachment(file: File, uid: string): Promise<ChannelAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("That file is too large to attach (50MB max).");
  const isVideo = file.type.startsWith("video");
  const path = `channelAttachments/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const mediaUrl = await getDownloadURL(storageRef);
  return { mediaUrl, mediaType: isVideo ? "video" : "photo" };
}
