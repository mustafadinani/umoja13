import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// This app runs against isolated resources inside the shared umoja-app
// Firebase project (a named Firestore database and a dedicated Storage
// bucket) rather than the project's `(default)` database/bucket, which
// belong to Umoja Outreach's existing production system.
export const FIRESTORE_DATABASE_ID = "umoja13-app";
export const STORAGE_BUCKET_NAME = "umoja-games-proto-media";

if (!getApps().length) {
  initializeApp();
}

export const db = getFirestore(FIRESTORE_DATABASE_ID);
// The project's `(default)` database — Umoja Outreach's existing registration
// data (uGames/{year}/playersRegistered etc.), read-only from this app's side.
export const defaultDb = getFirestore("(default)");
export const auth = getAuth();
export const storage = getStorage();
export const bucket: ReturnType<typeof storage.bucket> = storage.bucket(STORAGE_BUCKET_NAME);
