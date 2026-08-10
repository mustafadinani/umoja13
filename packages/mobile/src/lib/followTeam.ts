import { doc, setDoc } from "firebase/firestore";
import { COLLECTIONS, type UserProfile } from "@umoja/shared";
import { db } from "./firebase";

/**
 * Toggling "follow a team" used to be a bare `updateDoc` with
 * arrayUnion/arrayRemove straight at users/{uid} — which throws NOT_FOUND
 * for the common case of a real Outreach-registered fan, whose profile
 * lives only at (default)/profiles/{uid} and has never needed a
 * umoja13-app/users doc before. That threw silently (no catch at any call
 * site), so the star looked like it just did nothing and never remembered
 * the choice.
 *
 * Fix: setDoc the FULL already-resolved profile back with merge, not a
 * bare field update — creates the doc fully populated the first time
 * (same enrichment precedent as reviewVolunteerApplication/JoinTeamModal)
 * rather than a sparse one that would blank their real name/photo/family
 * data the next time useResolvedProfile treats any users doc as
 * authoritative over the richer Outreach-derived one.
 */
export async function toggleFollowTeam(uid: string, profile: UserProfile, teamId: string): Promise<void> {
  const current = profile.followedTeamIds ?? [];
  const followedTeamIds = current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId];
  await setDoc(doc(db, COLLECTIONS.users, uid), { ...profile, followedTeamIds, updatedAt: Date.now() }, { merge: true });
}
