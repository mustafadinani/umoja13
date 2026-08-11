import {
  DATA_SOURCES,
  mapOutreachProfileToUserProfile,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  type OutreachProfile,
  type RegisteredTeam,
} from "@umoja/shared";
import { auth, defaultDb } from "./admin.js";

/**
 * Resolves a human display name for a channel/message author.
 *
 * Every `send*Message` callable already reads the caller's umoja13-app
 * `users/{uid}` doc for role checks — pass that doc's `displayName` in as
 * `appDisplayName` so this only does extra reads when it's actually missing.
 * That's the common case for real Outreach registrants (players, fans,
 * volunteers) who have never gone through the app's own sign-up flow and so
 * have no `users/{uid}` doc at all: without this fallback chain their
 * messages render with the author name "Someone" everywhere.
 *
 * Fallback order: umoja13-app profile -> Outreach registration (family)
 * profile -> the team's registered captain name, when this uid IS that
 * captain -> Firebase Auth's own displayName (populated automatically for
 * Google sign-in) -> the email's local part -> a generic label as an
 * absolute last resort.
 *
 * Deliberately does NOT fall back to a `playersRegistered` row's
 * firstName/lastName here — that's the CHILD's name, not this account's
 * name (one shared family account can hold several kids), and using it
 * would misattribute an adult's message to whichever kid's registration
 * row happened to match, the same bug class the playerKey identity work
 * elsewhere in this app exists to avoid.
 */
export async function resolveAuthorName(uid: string, appDisplayName?: string): Promise<string> {
  if (appDisplayName?.trim()) return appDisplayName.trim();

  try {
    const outreachSnap = await defaultDb.collection(DATA_SOURCES.registration.profilesCollection).doc(uid).get();
    if (outreachSnap.exists) {
      const name = mapOutreachProfileToUserProfile(uid, outreachSnap.data() as OutreachProfile).displayName;
      if (name && name !== "Player") return name;
    }
  } catch {
    // Best-effort — fall through.
  }

  try {
    const teamSnap = await defaultDb
      .collection(REGISTRATION_ROOT)
      .doc(REGISTRATION_YEAR)
      .collection(TEAMS_REGISTERED)
      .where("uid", "==", uid)
      .limit(1)
      .get();
    const captainName = (teamSnap.docs[0]?.data() as RegisteredTeam | undefined)?.teamCaptainName?.trim();
    if (captainName) return captainName;
  } catch {
    // Best-effort — fall through to Auth.
  }

  try {
    const authUser = await auth.getUser(uid);
    if (authUser.displayName?.trim()) return authUser.displayName.trim();
    if (authUser.email) return authUser.email.split("@")[0];
  } catch {
    // Best-effort — fall through to the generic label.
  }

  return "Someone";
}
