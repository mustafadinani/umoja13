import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, HUNT_CONFIG_DOC_ID } from "@umoja/shared";
import { db } from "../util/admin.js";

interface SetHuntStartedRequest {
  started: boolean;
}

/**
 * Admin/commissioner-only: flips the single switch that reveals The Hunt to
 * everyone. This is a manual flag (`config/hunt.started`), not a
 * date-triggered auto-open — the Hunt is built and seeded well ahead of when
 * it should actually be visible, and staff need to control exactly when it
 * goes live regardless of what date was announced.
 */
export const setHuntStarted = onCall<SetHuntStartedRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(callerUid).get();
  const caller = callerSnap.data();
  const callerRoles: string[] = caller?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only admin/commissioner can start the Hunt.");
  }

  const { started } = request.data;
  if (typeof started !== "boolean") throw new HttpsError("invalid-argument", "started must be a boolean.");

  await db
    .collection(COLLECTIONS.config)
    .doc(HUNT_CONFIG_DOC_ID)
    .set(
      {
        started,
        startedAt: started ? Date.now() : null,
        startedByName: started ? caller?.displayName ?? "Umoja" : null,
      },
      { merge: true }
    );

  return { started };
});
