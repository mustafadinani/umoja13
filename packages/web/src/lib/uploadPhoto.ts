import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Some phones (mostly iPhones set to "High Efficiency" photo format) hand
 * a real HEIC file to a camera/photo-library `<input type="file">` even
 * though the input only accepts "image/*" — the browser just reports
 * whatever format the OS captured or stored it in. Uploading that File
 * as-is (the old code everywhere this replaces) lands real HEIC bytes in
 * Storage: Safari can decode HEIC (which is why the on-screen preview
 * during the same flow looks fine to the person submitting it) but
 * essentially every other browser — meaning almost every staff laptop
 * reviewing a check-in or application later — can't, so the review screen
 * shows a blank box even though the upload "succeeded".
 *
 * Re-encoding through <canvas> here, using the SAME browser that already
 * proved it can decode the file (the live preview), guarantees the bytes
 * that land in Storage are real, universally-viewable JPEG. Falls back to
 * uploading the original file untouched if the browser can't decode/encode
 * it for some other reason — never blocks submission on being unable to
 * convert (an unconverted HEIC still uploads, same as before this fix).
 */
export async function uploadPickedPhoto(file: File, path: string, quality = 0.85): Promise<string> {
  const jpeg = await toJpegBlob(file, quality);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, jpeg ?? file, { contentType: jpeg ? "image/jpeg" : file.type || "image/jpeg" });
  return getDownloadURL(storageRef);
}

async function toJpegBlob(file: File, quality: number): Promise<Blob | null> {
  // Already a format every browser renders — no need to touch it.
  if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  } catch {
    // Browser genuinely can't decode this format either — nothing we can
    // do client-side; the original upload path (unconverted) still runs.
    return null;
  }
}
