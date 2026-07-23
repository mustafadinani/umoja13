import { useMemo } from "react";
import { orderBy, where, type QueryConstraint } from "firebase/firestore";
import {
  COLLECTIONS,
  CATEGORIES,
  type Category,
  type Team,
  type Game,
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
} from "@umoja/shared";
import { useCollection, useDocument } from "./firestore";

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
export const useAnnouncements = () =>
  useCollection<Announcement>(COLLECTIONS.announcements, [orderBy("postedAt", "desc")]);
export const useHuntMissions = () => useCollection<HuntMission>(COLLECTIONS.huntMissions);

export const useTeams = (categoryId?: string) =>
  useCollection<Team>(
    COLLECTIONS.teams,
    categoryId ? [where("categoryId", "==", categoryId)] : []
  );

export const useTeam = (teamId: string | undefined) => useDocument<Team>(COLLECTIONS.teams, teamId);

export const useGames = (constraints: QueryConstraint[] = []) =>
  useCollection<Game>(COLLECTIONS.games, constraints);

export const useGame = (gameId: string | undefined) => useDocument<Game>(COLLECTIONS.games, gameId);

export const useMoments = (approvedOnly = true) =>
  useCollection<Moment>(
    COLLECTIONS.moments,
    approvedOnly
      ? [where("moderationStatus", "==", "approved"), orderBy("createdAt", "desc")]
      : [orderBy("createdAt", "desc")]
  );

export const useHuntCrews = () => useCollection<HuntCrew>(COLLECTIONS.huntCrews, [orderBy("points", "desc")]);

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
