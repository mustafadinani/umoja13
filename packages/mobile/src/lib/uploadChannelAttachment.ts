import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export interface ChannelAttachment {
  mediaUrl: string;
  mediaType: "photo" | "video";
}

/**
 * Opens the media library picker and uploads the result to the shared
 * chat-attachment Storage path — same upload-then-get-URL shape as Moments'
 * mobile uploader, just a different path (see storage.rules
 * `channelAttachments/{uid}`). Returns null if the user cancels or denies
 * the permission prompt, never throws for that case.
 */
export async function pickAndUploadChannelAttachment(uid: string): Promise<ChannelAttachment | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.7 });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const isVideo = asset.type === "video" || asset.uri.endsWith(".mov") || asset.uri.endsWith(".mp4");
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const path = `channelAttachments/${uid}/${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: isVideo ? "video/mp4" : "image/jpeg" });
  const mediaUrl = await getDownloadURL(storageRef);
  return { mediaUrl, mediaType: isVideo ? "video" : "photo" };
}
