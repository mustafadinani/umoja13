import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, GENERAL_POD_ID } from "@umoja/shared";
import { db } from "./admin.js";

/**
 * Every admin/commissioner/referee/volunteer lands in the "General" pod the
 * moment they get that role — before an admin has had a chance to sort them
 * into a field-specific pod, or for anyone (Entrance, Food Court) who never
 * fits neatly into one. Called from setUserRole and
 * reviewVolunteerApplication's approve path, wherever a uid's roles come to
 * include one of those four. Idempotent: safe to call on every role change.
 */
export async function ensureInGeneralPod(uid: string): Promise<void> {
  const now = Date.now();
  const ref = db.collection(COLLECTIONS.pods).doc(GENERAL_POD_ID);
  await ref.set(
    {
      name: "General",
      fields: [],
      isGeneral: true,
      updatedAt: now,
      memberUids: FieldValue.arrayUnion(uid),
    },
    { merge: true }
  );
  const snap = await ref.get();
  if (!snap.data()?.createdAt) {
    await ref.set({ createdAt: now }, { merge: true });
  }
}
