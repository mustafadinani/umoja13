import {
  DATA_SOURCES,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  mapOutreachProfileToUserProfile,
  type OutreachProfile,
  type RegisteredPlayer,
  type UserProfile,
} from "@umoja/shared";
import { defaultDb } from "./admin.js";

/**
 * Best-effort lookup of someone's real Outreach registration data (a
 * different Firestore database entirely — `(default)`, not this app's
 * `umoja13-app`), mapped into the shape a `users/{uid}` doc expects.
 *
 * Anywhere we're about to CREATE a users/{uid} doc for the first time (role
 * grant, volunteer approval, etc.), seeding it from this instead of a bare
 * `{roles}` stub matters: useResolvedProfile treats any users doc as
 * authoritative over the richer Outreach-derived profile the instant one
 * exists, so a bare stub would silently blank a real person's name, photo,
 * family, and team memberships the next time they open the app. Returns `{}`
 * (not a throw) when there's no Outreach profile to find — that's the normal
 * case for a staff/referee-only account with no registration history.
 */
export async function buildBaseProfileFromOutreach(targetUid: string): Promise<Partial<UserProfile>> {
  try {
    const outreachSnap = await defaultDb.collection(DATA_SOURCES.registration.profilesCollection).doc(targetUid).get();
    if (!outreachSnap.exists) return {};
    const playersSnap = await defaultDb
      .collection(REGISTRATION_ROOT)
      .doc(REGISTRATION_YEAR)
      .collection(PLAYERS_REGISTERED)
      .where("uid", "==", targetUid)
      .get();
    const players = playersSnap.docs.map((d) => ({ ...(d.data() as RegisteredPlayer), id: d.id }));
    return mapOutreachProfileToUserProfile(targetUid, outreachSnap.data() as OutreachProfile, players);
  } catch (err) {
    console.error(`buildBaseProfileFromOutreach: Outreach profile lookup failed for ${targetUid}, continuing without enrichment:`, err);
    return {};
  }
}
