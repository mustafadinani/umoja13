import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, GENERAL_POD_ID, type Pod } from "@umoja/shared";
import { db } from "../util/admin.js";
import { notifyUsers } from "../util/notify.js";

async function requireStaff(uid: string | undefined): Promise<void> {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const snap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = snap.data()?.roles ?? [];
  if (!roles.includes("admin") && !roles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only staff can manage pods.");
  }
}

interface CreatePodRequest {
  name: string;
  fields: string[];
  memberUids: string[];
}

/** Staff-only: creates a new pod and notifies anyone added to it right away. */
export const createPod = onCall<CreatePodRequest>(async (request) => {
  await requireStaff(request.auth?.uid);

  const { name, fields, memberUids } = request.data;
  if (!name?.trim()) throw new HttpsError("invalid-argument", "Pod name is required.");

  const now = Date.now();
  const ref = db.collection(COLLECTIONS.pods).doc();
  const pod: Pod = {
    id: ref.id,
    name: name.trim(),
    fields: fields ?? [],
    memberUids: memberUids ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(pod);

  if (pod.memberUids.length > 0) {
    await notifyUsers(pod.memberUids, `Added to ${pod.name}`, `You've been added to the ${pod.name} pod.`);
  }

  return { pod };
});

interface UpdatePodRequest {
  podId: string;
  name?: string;
  fields?: string[];
  memberUids?: string[];
}

/** Staff-only: renames a pod, changes its field coverage, or edits its roster. Notifies any newly-added members. */
export const updatePod = onCall<UpdatePodRequest>(async (request) => {
  await requireStaff(request.auth?.uid);

  const { podId, name, fields, memberUids } = request.data;
  if (!podId) throw new HttpsError("invalid-argument", "podId is required.");

  const ref = db.collection(COLLECTIONS.pods).doc(podId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Pod not found.");
  const existing = snap.data() as Pod;

  const update: Partial<Pod> & { updatedAt: number } = { updatedAt: Date.now() };
  if (name?.trim()) update.name = name.trim();
  if (fields) update.fields = fields;
  if (memberUids) update.memberUids = memberUids;

  await ref.set(update, { merge: true });

  if (memberUids) {
    const added = memberUids.filter((u) => !existing.memberUids.includes(u));
    if (added.length > 0) {
      const podName = update.name ?? existing.name;
      await notifyUsers(added, `Added to ${podName}`, `You've been added to the ${podName} pod.`);
    }
  }

  return { ok: true };
});

interface DeletePodRequest {
  podId: string;
}

/** Staff-only: deletes a pod (and its channel). The General pod can't be deleted — it's the always-available catch-all. */
export const deletePod = onCall<DeletePodRequest>(async (request) => {
  await requireStaff(request.auth?.uid);

  const { podId } = request.data;
  if (!podId) throw new HttpsError("invalid-argument", "podId is required.");
  if (podId === GENERAL_POD_ID) throw new HttpsError("failed-precondition", "The General pod can't be deleted.");

  await db.collection(COLLECTIONS.pods).doc(podId).delete();
  await db.collection(COLLECTIONS.podChannels).doc(podId).delete();

  return { ok: true };
});

/**
 * Ensures the General pod document exists. Normally created the first time
 * ensureInGeneralPod runs off a role change (setUserRole /
 * reviewVolunteerApplication), but on a fresh deploy nobody's roles are
 * *changing* — they were already set before this feature existed — so the
 * admin Pods tab calls this once on mount to guarantee it's there to list/edit.
 */
export const ensurePodsSeeded = onCall(async (request) => {
  await requireStaff(request.auth?.uid);
  const ref = db.collection(COLLECTIONS.pods).doc(GENERAL_POD_ID);
  const snap = await ref.get();
  if (!snap.exists) {
    const now = Date.now();
    const pod: Pod = { id: GENERAL_POD_ID, name: "General", fields: [], memberUids: [], isGeneral: true, createdAt: now, updatedAt: now };
    await ref.set(pod);
  }
  return { ok: true };
});
