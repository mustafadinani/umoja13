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
  type HuntCrew,
  type HuntMission,
  type HuntSubmission,
  type Notification,
  type CheckIn,
  type TournamentPass,
  type Challenge,
  type ChallengeSubmission,
} from "@umoja/shared";
import { useCollection, useDocument } from "./firestore";

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

export const useTeams = (categoryId?: string) =>
  useCollection<Team>(COLLECTIONS.teams, categoryId ? [where("categoryId", "==", categoryId)] : []);

export const useTeam = (teamId: string | undefined) => useDocument<Team>(COLLECTIONS.teams, teamId);

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
