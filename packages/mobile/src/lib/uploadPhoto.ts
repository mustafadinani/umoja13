import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * TEMPORARILY reverted off expo-image-manipulator (see git history for the
 * real-JPEG-reencode version) — that import chain (CheckInScreen ->
 * expo-image-manipulator, statically pulled in by RootNavigator at app
 * startup) is the prime suspect for build #58 crashing on open in
 * TestFlight: expo-image-manipulator calls `requireNativeModule` at module
 * scope, and if that native module isn't actually wired up correctly in a
 * given build, the throw happens during JS bundle evaluation, before any
 * screen renders — i.e. an instant crash on launch. Reverting to a plain
 * fetch+upload (still labels contentType, just doesn't guarantee real
 * re-encoded bytes) removes that import entirely so this ships as an OTA
 * hotfix without needing a new native build. Re-apply the real fix once
 * expo-image-manipulator's native linking is confirmed working in a build
 * that's been smoke-tested before wide rollout.
 */
export async function uploadPickedPhoto(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
