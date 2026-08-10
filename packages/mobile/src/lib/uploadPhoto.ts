import * as ImageManipulator from "expo-image-manipulator";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Some phones (mostly iPhones set to "High Efficiency" photo format) hand
 * ImagePicker a real HEIC file even when asked for "images" — the picker
 * just returns whatever format the OS captured or stored it in, and photo
 * *library* picks (as opposed to a fresh camera capture) are HEIC on iOS
 * far more often than not. Labeling the Storage upload
 * `contentType: "image/jpeg"` without actually re-encoding (the old code
 * everywhere below) doesn't fix anything — the bytes are still real HEIC,
 * so any reviewer on a non-Apple device/browser (basically every staff
 * laptop reviewing check-ins, roster photos, or sponsor logos) gets a
 * blank box where the photo should be, even though the upload "succeeded".
 * Routing every picked image through ImageManipulator forces a real JPEG
 * re-encode regardless of source format, so whatever lands in Storage is
 * universally viewable.
 */
export async function uploadPickedPhoto(uri: string, path: string, compress = 0.7): Promise<string> {
  const jpeg = await ImageManipulator.manipulateAsync(uri, [], { compress, format: ImageManipulator.SaveFormat.JPEG });
  const response = await fetch(jpeg.uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
