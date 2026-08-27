import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS } from "@umoja/shared";
import { auth, db } from "../util/admin.js";

interface LookupUserByEmailRequest {
  email: string;
}

/**
 * Staff-only: resolves an email to a Firebase Auth uid, for adding someone to
 * a Pod who exists as a real account (e.g. an Outreach family manager) but
 * has no umoja13-app `users` profile doc and isn't in playersRegistered —
 * email is the only identifier the registration data reliably carries for
 * that population, so name search can't find them.
 */
export const lookupUserByEmail = onCall<LookupUserByEmailRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const callerSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const callerRoles: string[] = callerSnap.data()?.roles ?? [];
  if (!callerRoles.includes("admin") && !callerRoles.includes("commissioner")) {
    throw new HttpsError("permission-denied", "Only staff can look up users by email.");
  }

  const email = request.data.email?.trim().toLowerCase();
  if (!email) throw new HttpsError("invalid-argument", "email is required.");

  try {
    const userRecord = await auth.getUserByEmail(email);
    return {
      user: {
        uid: userRecord.uid,
        email: userRecord.email ?? email,
        displayName: userRecord.displayName ?? email,
      },
    };
  } catch {
    return { user: null };
  }
});
