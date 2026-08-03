import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  GENERAL_POD_ID,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  type Pod,
  type RegisteredPlayer,
} from "@umoja/shared";
import { db, defaultDb } from "../util/admin.js";
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

interface GetPodMemberNamesRequest {
  podId: string;
}

/**
 * Any pod member (or staff) can resolve display names for their own pod's
 * roster — a targeted Admin SDK read, since `users/{uid}` reads are locked
 * to the owner or staff and a regular member has no other way to see who
 * "uid abc123" is when picking an assignee for a task/shift they're adding.
 */
export const getPodMemberNames = onCall<GetPodMemberNamesRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { podId } = request.data;
  if (!podId) throw new HttpsError("invalid-argument", "podId is required.");

  const podSnap = await db.collection(COLLECTIONS.pods).doc(podId).get();
  if (!podSnap.exists) throw new HttpsError("not-found", "Pod not found.");
  const pod = podSnap.data() as Pod;

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const roles: string[] = callerSnap.data()?.roles ?? [];
  const isStaff = roles.includes("admin") || roles.includes("commissioner");
  if (!isStaff && !pod.memberUids.includes(uid)) {
    throw new HttpsError("permission-denied", "Not a member of this pod.");
  }

  const memberDocs = await Promise.all(
    pod.memberUids.map((memberUid) => db.collection(COLLECTIONS.users).doc(memberUid).get())
  );
  const nameByUid = new Map<string, string>();
  memberDocs.forEach((snap, i) => {
    const displayName = snap.data()?.displayName as string | undefined;
    if (displayName) nameByUid.set(pod.memberUids[i], displayName);
  });

  // Some pod members are registration-only rows (e.g. a board member or
  // player who never signed into the app) whose "uid" is a client-generated
  // placeholder id with no users/{uid} doc — look those up in registration
  // data instead, the same fallback the client used before this callable
  // existed.
  const unresolvedUids = pod.memberUids.filter((memberUid) => !nameByUid.has(memberUid));
  const playersCol = defaultDb.collection(REGISTRATION_ROOT).doc(REGISTRATION_YEAR).collection(PLAYERS_REGISTERED);
  for (let i = 0; i < unresolvedUids.length; i += 30) {
    const chunk = unresolvedUids.slice(i, i + 30);
    const snap = await playersCol.where("uid", "in", chunk).get();
    for (const doc of snap.docs) {
      const p = doc.data() as RegisteredPlayer;
      if (p.uid && !nameByUid.has(p.uid)) nameByUid.set(p.uid, `${p.firstName} ${p.lastName}`.trim());
    }
  }

  const members = pod.memberUids.map((memberUid) => ({ uid: memberUid, displayName: nameByUid.get(memberUid) ?? memberUid }));

  return { members };
});

interface GetRecruitableVolunteersRequest {
  podId: string;
}

/**
 * Lets a pod's own volunteer members (not just staff) find other registered
 * volunteers to recruit onto the pod — pod *creation* stays staff-only, but
 * growing an existing pod's roster shouldn't require an admin in the loop.
 * Reads across `users` with an Admin SDK query since a plain volunteer can't
 * run `where("roles", "array-contains", "volunteer")` themselves (rules only
 * allow reading your own user doc, or staff reading anyone's).
 */
export const getRecruitableVolunteers = onCall<GetRecruitableVolunteersRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { podId } = request.data;
  if (!podId) throw new HttpsError("invalid-argument", "podId is required.");

  const podSnap = await db.collection(COLLECTIONS.pods).doc(podId).get();
  if (!podSnap.exists) throw new HttpsError("not-found", "Pod not found.");
  const pod = podSnap.data() as Pod;

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  const isStaffCaller = callerRoles.includes("admin") || callerRoles.includes("commissioner");
  const isRecruiter = isStaffCaller || (pod.memberUids.includes(uid) && callerRoles.includes("volunteer"));
  if (!isRecruiter) {
    throw new HttpsError("permission-denied", "Only this pod's volunteer members (or staff) can recruit.");
  }

  const volunteersSnap = await db.collection(COLLECTIONS.users).where("roles", "array-contains", "volunteer").get();
  const candidates = volunteersSnap.docs
    .filter((d) => !pod.memberUids.includes(d.id))
    .map((d) => ({ uid: d.id, displayName: (d.data().displayName as string | undefined) ?? "Unknown" }));

  return { candidates };
});

interface AddPodVolunteerRequest {
  podId: string;
  uidToAdd: string;
}

/**
 * Adds one volunteer to a pod's roster. Callable by staff, or by any existing
 * volunteer member of that same pod recruiting a fellow registered volunteer
 * (target must hold the "volunteer" role too, so this can't be used to pull
 * in arbitrary strangers — only people who've already signed up to
 * volunteer). Unlike `updatePod`, this takes a single uid and unions it in
 * server-side rather than trusting a client-supplied full roster replace.
 */
export const addPodVolunteer = onCall<AddPodVolunteerRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { podId, uidToAdd } = request.data;
  if (!podId || !uidToAdd) throw new HttpsError("invalid-argument", "podId and uidToAdd are required.");

  const ref = db.collection(COLLECTIONS.pods).doc(podId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Pod not found.");
  const pod = snap.data() as Pod;

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  const isStaffCaller = callerRoles.includes("admin") || callerRoles.includes("commissioner");
  const isRecruiter = isStaffCaller || (pod.memberUids.includes(uid) && callerRoles.includes("volunteer"));
  if (!isRecruiter) {
    throw new HttpsError("permission-denied", "Only this pod's volunteer members (or staff) can recruit.");
  }

  if (pod.memberUids.includes(uidToAdd)) return { ok: true };

  if (!isStaffCaller) {
    const targetSnap = await db.collection(COLLECTIONS.users).doc(uidToAdd).get();
    const targetRoles: string[] = targetSnap.data()?.roles ?? [];
    if (!targetRoles.includes("volunteer")) {
      throw new HttpsError("failed-precondition", "You can only recruit registered volunteers.");
    }
  }

  await ref.update({ memberUids: FieldValue.arrayUnion(uidToAdd), updatedAt: Date.now() });
  await notifyUsers([uidToAdd], `Added to ${pod.name}`, `You've been added to the ${pod.name} pod.`);

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
