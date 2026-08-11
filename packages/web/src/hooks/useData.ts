import { useMemo } from "react";
import { orderBy, where, type QueryConstraint } from "firebase/firestore";
import {
  COLLECTIONS,
  CATEGORIES,
  type Category,
  type Game,
  type GameScorers,
  type Moment,
  type Announcement,
  type Sponsor,
  type Incident,
  type HuntCrew,
  type HuntMission,
  type HuntSubmission,
  type Notification,
  type UserProfile,
  type CheckIn,
  type VolunteerApplication,
  type VolunteerTask,
  type Challenge,
  type ChallengeSubmission,
  type SponsorshipOrder,
  type TeamChannel,
  type ChannelRole,
  type RoleChannel,
  type UserChannel,
  type Pod,
  type PodChannel,
  type PodTask,
  type Draw,
  type CategoryAwards,
  type HuntConfig,
  HUNT_CONFIG_DOC_ID,
} from "@umoja/shared";
import { useCollection, useDocument } from "./firestore";
import { useRegistrationTeam, useRegistrationTeams } from "./useRegistration";

const CATEGORY_ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i]));

/** Firestore returns categories in arbitrary doc-id order; re-sort to the canonical tournament order. */
export function useCategories() {
  const result = useCollection<Category>(COLLECTIONS.categories);
  const sorted = useMemo(
    () => [...result.data].sort((a, b) => (CATEGORY_ORDER.get(a.id) ?? 99) - (CATEGORY_ORDER.get(b.id) ?? 99)),
    [result.data]
  );
  return { ...result, data: sorted };
}
export const useSponsors = () => useCollection<Sponsor>(COLLECTIONS.sponsors);
export const useSponsorshipOrders = () =>
  useCollection<SponsorshipOrder>(COLLECTIONS.sponsorshipOrders, [orderBy("createdAt", "desc")]);
export const useAnnouncements = () =>
  useCollection<Announcement>(COLLECTIONS.announcements, [orderBy("postedAt", "desc")]);
export const useHuntMissions = () => useCollection<HuntMission>(COLLECTIONS.huntMissions);

export const useTeams = (categoryId?: string) => useRegistrationTeams(categoryId);

export const useTeam = (teamId: string | undefined) => useRegistrationTeam(teamId);
export const useTeamChannel = (teamId: string | undefined) => useDocument<TeamChannel>(COLLECTIONS.teamChannels, teamId);
export const useRoleChannel = (role: ChannelRole) => useDocument<RoleChannel>(COLLECTIONS.roleChannels, role);
export const useUserChannel = (uid: string | undefined) => useDocument<UserChannel>(COLLECTIONS.userChannels, uid);

export const usePods = () => useCollection<Pod>(COLLECTIONS.pods);
export const usePod = (podId: string | undefined) => useDocument<Pod>(COLLECTIONS.pods, podId);
export const usePodChannel = (podId: string | undefined) => useDocument<PodChannel>(COLLECTIONS.podChannels, podId);

/** Every podChannel doc for a given set of pod ids (e.g. the ones a user belongs to), for aggregate unread checks. */
export const usePodChannelsFor = (podIds: string[]) =>
  useCollection<PodChannel>(
    COLLECTIONS.podChannels,
    podIds.length > 0 ? [where("podId", "in", podIds.slice(0, 30))] : [where("podId", "==", "__none__")]
  );

/**
 * Pods a uid belongs to. Deliberately its own array-contains query, not a
 * client-side filter over usePods()'s full unscoped list — that unscoped
 * list only succeeds for staff, since the pods/{id} rule's non-staff branch
 * depends on per-document data. Firestore rejects an unscoped list query
 * outright for anyone that branch would be needed for (a plain fan/player
 * pod member), because it can't prove the query is safe without the query
 * itself being scoped to match — so a non-staff caller got silently zero
 * pods back, not just their own trimmed down.
 */
export const useMyPods = (uid: string | undefined) =>
  useCollection<Pod>(COLLECTIONS.pods, uid ? [where("memberUids", "array-contains", uid)] : []);

export const useGames = (constraints: QueryConstraint[] = []) =>
  useCollection<Game>(COLLECTIONS.games, constraints);

export const useGame = (gameId: string | undefined) => useDocument<Game>(COLLECTIONS.games, gameId);

/** Staff (or this game's assigned referee) only — see GameScorers' doc comment for why this is a separate collection from `games`. */
export const useGameScorers = (gameId: string | undefined) => useDocument<GameScorers>(COLLECTIONS.gameScorers, gameId);

export const useDraw = (categoryId: string | undefined) => useDocument<Draw>(COLLECTIONS.draws, categoryId);

/** Award-ceremony nominees/winners for one category — id == categoryId. */
export const useCategoryAwards = (categoryId: string | undefined) =>
  useDocument<CategoryAwards>(COLLECTIONS.categoryAwards, categoryId);
/** Every category's awards doc at once — the sidebar progress dots and the presenter stage both need the full set, not one category at a time. */
export const useAllCategoryAwards = () => useCollection<CategoryAwards>(COLLECTIONS.categoryAwards);

export const useMoments = (approvedOnly = true) =>
  useCollection<Moment>(
    COLLECTIONS.moments,
    approvedOnly
      ? [where("moderationStatus", "==", "approved"), orderBy("createdAt", "desc")]
      : [orderBy("createdAt", "desc")]
  );

export const useHuntCrews = () => useCollection<HuntCrew>(COLLECTIONS.huntCrews, [orderBy("points", "desc")]);

/** The single admin-controlled switch that reveals The Hunt to everyone — see types/huntConfig.ts. */
export const useHuntConfig = () => useDocument<HuntConfig>(COLLECTIONS.config, HUNT_CONFIG_DOC_ID);

export const useIncidents = (constraints: QueryConstraint[] = []) =>
  useCollection<Incident>(COLLECTIONS.incidents, [orderBy("createdAt", "desc"), ...constraints]);

export const useMyNotifications = (uid: string | undefined) =>
  useCollection<Notification>(
    COLLECTIONS.notifications,
    uid ? [where("userId", "==", uid), orderBy("createdAt", "desc")] : []
  );

export const useReferees = () => useCollection<UserProfile>(COLLECTIONS.users, [where("roles", "array-contains", "referee")]);

export const useAllCheckIns = () => useCollection<CheckIn>(COLLECTIONS.checkIns, [orderBy("submittedAt", "desc")]);

export const useAllMoments = () => useCollection<Moment>(COLLECTIONS.moments, [orderBy("createdAt", "desc")]);

/** A signed-in user's own moments regardless of moderation status, so they can see pending/rejected posts that the public feed hides. */
export const useMyMoments = (uid: string | undefined) =>
  useCollection<Moment>(COLLECTIONS.moments, uid ? [where("postedBy", "==", uid), orderBy("createdAt", "desc")] : []);

/**
 * The browsable Hunt feed — approved mission/challenge submissions only.
 * Both HuntAdminTab.reviewSubmission and reviewChallengeSubmission mirror an
 * approved photo/video submission onto `moments` with source:"hunt" the
 * moment it's approved, so this is exactly the already-vetted subset —
 * pending/rejected submissions never make it into `moments` at all.
 */
export const useHuntMoments = () =>
  useCollection<Moment>(COLLECTIONS.moments, [
    where("source", "==", "hunt"),
    where("moderationStatus", "==", "approved"),
    orderBy("createdAt", "desc"),
  ]);

/** Staff-only: full user directory, used to resolve display names next to check-ins/rosters. */
export const useAllUsers = () => useCollection<UserProfile>(COLLECTIONS.users);

export const useMyCrew = (uid: string | undefined) => {
  const result = useCollection<HuntCrew>(COLLECTIONS.huntCrews, uid ? [where("memberUids", "array-contains", uid)] : []);
  return { ...result, data: result.data[0] ?? null };
};

export const useMyInvites = (email: string | undefined) =>
  useCollection<HuntCrew>(COLLECTIONS.huntCrews, email ? [where("memberEmails", "array-contains", email.toLowerCase())] : []);

export const useHuntSubmissions = (constraints: QueryConstraint[] = []) =>
  useCollection<HuntSubmission>(COLLECTIONS.huntSubmissions, [orderBy("createdAt", "desc"), ...constraints]);

/** A crew's own mission submissions, so the Hunt UI can show persisted pending/approved/rejected status + the submitted media, not just an ephemeral in-modal state. */
export const useMyHuntSubmissions = (crewId: string | undefined) =>
  useCollection<HuntSubmission>(
    COLLECTIONS.huntSubmissions,
    crewId ? [where("crewId", "==", crewId), orderBy("createdAt", "desc")] : []
  );

export const useVolunteers = () =>
  useCollection<UserProfile>(COLLECTIONS.users, [where("roles", "array-contains", "volunteer")]);

export const useVolunteerApplications = (constraints: QueryConstraint[] = []) =>
  useCollection<VolunteerApplication>(COLLECTIONS.volunteerApplications, [orderBy("createdAt", "desc"), ...constraints]);

export const useVolunteerTasks = () =>
  useCollection<VolunteerTask>(COLLECTIONS.volunteerTasks, [orderBy("createdAt", "desc")]);

export const useMyVolunteerTasks = (uid: string | undefined) =>
  useCollection<VolunteerTask>(
    COLLECTIONS.volunteerTasks,
    uid ? [where("assigneeUid", "==", uid)] : []
  );

export const useVolunteerTasksByPod = (podId: string | undefined) =>
  useCollection<VolunteerTask>(COLLECTIONS.volunteerTasks, podId ? [where("podId", "==", podId)] : []);

export const useGamesByPod = (podId: string | undefined) =>
  useCollection<Game>(COLLECTIONS.games, podId ? [where("podId", "==", podId)] : []);

/** No orderBy here on purpose — where(podId) + orderBy(createdAt) needs a composite index; sorted client-side in PodTasksTab instead. */
export const usePodTasksByPod = (podId: string | undefined) =>
  useCollection<PodTask>(COLLECTIONS.podTasks, podId ? [where("podId", "==", podId)] : []);

export const useMyPodTasks = (uid: string | undefined) =>
  useCollection<PodTask>(COLLECTIONS.podTasks, uid ? [where("assigneeUid", "==", uid)] : []);

export const useChallenges = () => useCollection<Challenge>(COLLECTIONS.challenges, [orderBy("createdAt", "desc")]);

export const useChallengeSubmissions = (constraints: QueryConstraint[] = []) =>
  useCollection<ChallengeSubmission>(COLLECTIONS.challengeSubmissions, [orderBy("createdAt", "desc"), ...constraints]);

/** A crew's own challenge submissions, so the Hunt UI can show pending/rejected status per challenge. */
export const useMyChallengeSubmissions = (crewId: string | undefined) =>
  useCollection<ChallengeSubmission>(
    COLLECTIONS.challengeSubmissions,
    crewId ? [where("crewId", "==", crewId), orderBy("createdAt", "desc")] : []
  );
