import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
// @ts-expect-error — Metro resolves this to the real React Native build (which
// does export getReactNativePersistence) via the "react-native" package export
// condition; the published firebase/auth *types* don't surface it. Known SDK
// gap: https://github.com/firebase/firebase-js-sdk/issues/7615
import { getReactNativePersistence } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const firestoreDatabaseId = process.env.EXPO_PUBLIC_FIRESTORE_DATABASE_ID || "umoja13-app";
const storageBucketUrl = process.env.EXPO_PUBLIC_STORAGE_BUCKET_URL || "gs://umoja-games-proto-media";
const useEmulators = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "true";

// The Android emulator can't reach the host machine via localhost — it needs
// the special 10.0.2.2 alias. Physical devices/iOS simulator use localhost.
const emulatorHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";

const alreadyInitialized = getApps().length > 0;

export const app = alreadyInitialized ? getApp() : initializeApp(firebaseConfig);

// initializeAuth must only be called once per app (Metro fast refresh can
// re-run this module against an app that's already been initialized).
export const auth: Auth = alreadyInitialized
  ? getAuth(app)
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

export const db = initializeFirestore(app, {}, firestoreDatabaseId);
/** Outreach / registration data (teamsRegistered, playersRegistered) lives on the project's default DB. */
export const defaultDb = initializeFirestore(app, {}, "(default)");
export const storage = getStorage(app, storageBucketUrl);

if (useEmulators) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`);
  connectFirestoreEmulator(db, emulatorHost, 8080);
  // Named + default DBs share the emulator host when emulating; skip dual connect if unsupported.
  connectStorageEmulator(storage, emulatorHost, 9199);
}
