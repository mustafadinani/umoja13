import { DATA_SOURCES, mapOutreachProfileToUserProfile, type OutreachProfile } from "@umoja/shared";
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
 * Fallback order: umoja13-app profile -> Outreach registration profile ->
 * Firebase Auth's own displayName (populated automatically for Google
 * sign-in) -> the email's local part -> a generic label as an absolute last
 * resort.
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
