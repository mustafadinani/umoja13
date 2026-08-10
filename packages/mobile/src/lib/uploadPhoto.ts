import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Plain fetch+upload (labels contentType, doesn't guarantee real re-encoded
 * bytes). expo-image-manipulator was removed entirely — that import chain
 * (CheckInScreen -> expo-image-manipulator, statically pulled in by
 * RootNavigator at app startup) crashed build #58 on launch:
 * expo-image-manipulator calls `requireNativeModule` at module scope, and
 * when that native module wasn't wired up correctly in that build, the
 * throw happened during JS bundle evaluation, before any screen rendered.
 * See git history for the real-JPEG-reencode version if retrying this with
 * proper native-linking verification and smoke-testing first.
 */
export async function uploadPickedPhoto(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
