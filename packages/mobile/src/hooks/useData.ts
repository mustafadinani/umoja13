import { useMemo } from "react";
import { orderBy, where, type QueryConstraint } from "firebase/firestore";
import {
  COLLECTIONS,
  CATEGORIES,
  type Category,
  type Game,
  type Moment,
  type Announcement,
  type Sponsor,
  type HuntCrew,
  type HuntMission,
  type HuntSubmission,
  type Notification,
  type CheckIn,
  type TournamentPass,
  type Challenge,
  type ChallengeSubmission,
  type VolunteerTask,
  type VolunteerApplication,
  type TeamChannel,
  type ChannelRole,
  type RoleChannel,
  type UserChannel,
  type Pod,
  type PodChannel,
  type PodTask,
} from "@umoja/shared";
import { useCollection, useDocument } from "./firestore";
import { useRegistrationTeam, useRegistrationTeams } from "./useRegistration";

const CATEGORY_ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i]));

export function useCategories() {
  const result = useCollection<Category>(COLLECTIONS.categories);
  const sorted = useMemo(
    () => [...result.data].sort((a, b) => (CATEGORY_ORDER.get(a.id) ?? 99) - (CATEGORY_ORDER.get(b.id) ?? 99)),
    [result.data]
  );
  return { ...result, data: sorted };
}

export const useSponsors = () => useCollection<Sponsor>(COLLECTIONS.sponsors);
export const useAnnouncements = () => useCollection<Announcement>(COLLECTIONS.announcements, [orderBy("postedAt", "desc")]);
export const useHuntMissions = () => useCollection<HuntMission>(COLLECTIONS.huntMissions);

export const useTeams = (categoryId?: string) => useRegistrationTeams(categoryId);

export const useTeam = (teamId: string | undefined) => useRegistrationTeam(teamId);
export const useTeamChannel = (teamId: string | undefined) => useDocument<TeamChannel>(COLLECTIONS.teamChannels, teamId);
export const useRoleChannel = (role: ChannelRole) => useDocument<RoleChannel>(COLLECTIONS.roleChannels, role);
export const useUserChannel = (uid: string | undefined) => useDocument<UserChannel>(COLLECTIONS.userChannels, uid);

export const usePods = () => useCollection<Pod>(COLLECTIONS.pods);
export const usePodChannel = (podId: string | undefined) => useDocument<PodChannel>(COLLECTIONS.podChannels, podId);

/**
 * Pods a uid belongs to — its own array-contains query, not a client filter
 * over usePods()'s unscoped list. That unscoped list only succeeds for
 * staff (the pods/{id} rule's non-staff branch is per-document, so
 * Firestore rejects an unscoped list outright for anyone relying on it),
 * so a plain fan/player pod member got silently zero pods back.
 */
export const useMyPods = (uid: string | undefined) =>
  useCollection<Pod>(COLLECTIONS.pods, uid ? [where("memberUids", "array-contains", uid)] : []);

export const useVolunteerTasksByPod = (podId: string | undefined) =>
  useCollection<VolunteerTask>(COLLECTIONS.volunteerTasks, podId ? [where("podId", "==", podId)] : []);

export const useGamesByPod = (podId: string | undefined) =>
  useCollection<Game>(COLLECTIONS.games, podId ? [where("podId", "==", podId)] : []);

/** No orderBy here on purpose — where(podId) + orderBy(createdAt) needs a composite index; sorted client-side in PodTaskList instead. */
export const usePodTasksByPod = (podId: string | undefined) =>
  useCollection<PodTask>(COLLECTIONS.podTasks, podId ? [where("podId", "==", podId)] : []);

export const useMyPodTasks = (uid: string | undefined) =>
  useCollection<PodTask>(COLLECTIONS.podTasks, uid ? [where("assigneeUid", "==", uid)] : []);

export const useGames = (constraints: QueryConstraint[] = []) => useCollection<Game>(COLLECTIONS.games, constraints);
export const useGame = (gameId: string | undefined) => useDocument<Game>(COLLECTIONS.games, gameId);

export const useMoments = (approvedOnly = true) =>
  useCollection<Moment>(
    COLLECTIONS.moments,
    approvedOnly ? [where("moderationStatus", "==", "approved"), orderBy("createdAt", "desc")] : [orderBy("createdAt", "desc")]
  );

/** A signed-in user's own moments regardless of moderation status, so they can see pending/rejected posts that the public feed hides. */
export const useMyMoments = (uid: string | undefined) =>
  useCollection<Moment>(COLLECTIONS.moments, uid ? [where("postedBy", "==", uid), orderBy("createdAt", "desc")] : []);

export const useHuntCrews = () => useCollection<HuntCrew>(COLLECTIONS.huntCrews, [orderBy("points", "desc")]);

export const useMyNotifications = (uid: string | undefined) =>
  useCollection<Notification>(COLLECTIONS.notifications, uid ? [where("userId", "==", uid), orderBy("createdAt", "desc")] : []);

export const useMyCrew = (uid: string | undefined) => {
  const result = useCollection<HuntCrew>(COLLECTIONS.huntCrews, uid ? [where("memberUids", "array-contains", uid)] : []);
  return { ...result, data: result.data[0] ?? null };
};

export const useMyInvites = (email: string | undefined) =>
  useCollection<HuntCrew>(COLLECTIONS.huntCrews, email ? [where("memberEmails", "array-contains", email.toLowerCase())] : []);

export const useCheckIn = (checkInId: string) => useDocument<CheckIn>(COLLECTIONS.checkIns, checkInId);
export const usePass = (checkInId: string) => useDocument<TournamentPass>(COLLECTIONS.tournamentPasses, checkInId);

export const useChallenges = () => useCollection<Challenge>(COLLECTIONS.challenges, [orderBy("createdAt", "desc")]);

/** A crew's own challenge submissions, so the Hunt UI can show pending/rejected status per challenge. */
export const useMyChallengeSubmissions = (crewId: string | undefined) =>
  useCollection<ChallengeSubmission>(
    COLLECTIONS.challengeSubmissions,
    crewId ? [where("crewId", "==", crewId), orderBy("createdAt", "desc")] : []
  );

/** A crew's own mission submissions, so the Hunt UI can show persisted pending/approved/rejected status + the submitted media. */
export const useMyHuntSubmissions = (crewId: string | undefined) =>
  useCollection<HuntSubmission>(
    COLLECTIONS.huntSubmissions,
    crewId ? [where("crewId", "==", crewId), orderBy("createdAt", "desc")] : []
  );

/** Shifts assigned to this volunteer. */
export const useMyVolunteerTasks = (uid: string | undefined) =>
  useCollection<VolunteerTask>(COLLECTIONS.volunteerTasks, uid ? [where("assigneeUid", "==", uid)] : []);

/** This account's own "Become a Volunteer" applications, so we can tell whether a specific kid's name has already applied. */
export const useMyVolunteerApplications = (uid: string | undefined) =>
  useCollection<VolunteerApplication>(COLLECTIONS.volunteerApplications, uid ? [where("filedByUid", "==", uid)] : []);
