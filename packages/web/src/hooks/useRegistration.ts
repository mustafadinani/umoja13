import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import {
  COLLECTIONS,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  buildRegistrationCategoryBuckets,
  buildTeamFromRegistration,
  buildTeamsFromRegistration,
  type Category,
  type RegisteredPlayer,
  type RegisteredTeam,
  type RegistrationCategoryBucket,
  type RosterCheckIn,
  type Team,
  type UserProfile,
} from "@umoja/shared";
import { db, defaultDb } from "../lib/firebase";
import { useCollection } from "./firestore";

function usePathCollection<T extends DocumentData>(
  firestore: Firestore,
  path: [string, string, string],
  constraints: QueryConstraint[] = []
): { data: (T & { id: string })[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathKey = path.join("/");
  const constraintKey = JSON.stringify(constraints);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const col = collection(firestore, path[0], path[1], path[2]);
    const q = constraints.length > 0 ? query(col, ...constraints) : query(col);
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error(`usePathCollection(${pathKey}) snapshot error:`, err);
        setData([]);
        setError(err.message);
        setLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, pathKey, constraintKey]);

  return { data, loading, error };
}

const teamsPath = [REGISTRATION_ROOT, REGISTRATION_YEAR, TEAMS_REGISTERED] as [string, string, string];
const playersPath = [REGISTRATION_ROOT, REGISTRATION_YEAR, PLAYERS_REGISTERED] as [string, string, string];

/** Raw registration players from `(default)` / uGames/2026/playersRegistered. */
export function useRegisteredPlayers() {
  return usePathCollection<RegisteredPlayer>(defaultDb, playersPath);
}

/** Raw registration teams from `(default)` / uGames/2026/teamsRegistered. */
export function useRegisteredTeamsRaw() {
  return usePathCollection<RegisteredTeam>(defaultDb, teamsPath);
}

/** Category pills with team counts — shared by Admin Teams + Standings. */
export function useRegistrationCategoryBuckets(): {
  buckets: RegistrationCategoryBucket[];
  loading: boolean;
  error: string | null;
} {
  const teams = useRegisteredTeamsRaw();
  const categories = useCollection<Category>(COLLECTIONS.categories);
  const buckets = useMemo(
    () => buildRegistrationCategoryBuckets(teams.data, categories.data),
    [teams.data, categories.data]
  );
  return { buckets, loading: teams.loading || categories.loading, error: teams.error };
}

/**
 * Live teams + players from `(default)` / uGames/2026, shaped as Team for the UI.
 * Category resolution uses live `umoja13-app/categories` so Standings pills match.
 * Stats/group overlay from `umoja13-app/teams` when a doc shares the registration id.
 */
export function useRegistrationTeams(categoryId?: string): { data: Team[]; loading: boolean; error: string | null } {
  const teams = useRegisteredTeamsRaw();
  const players = useRegisteredPlayers();
  const rosterCheckIns = useCollection<RosterCheckIn>(COLLECTIONS.rosterCheckIns);
  const categories = useCollection<Category>(COLLECTIONS.categories);
  const appTeams = useCollection<Team>(COLLECTIONS.teams);

  const data = useMemo(() => {
    const catalog = categories.data;
    const appById = new Map(
      appTeams.data.map((t) => [
        t.id,
        { stats: t.stats, group: t.group, color: t.color, sponsorId: t.sponsorId, coachManagerUids: t.coachManagerUids },
      ])
    );
    return buildTeamsFromRegistration(
      teams.data,
      players.data,
      categoryId,
      rosterCheckIns.data,
      catalog,
      appById
    );
  }, [teams.data, players.data, categoryId, rosterCheckIns.data, categories.data, appTeams.data]);

  return {
    data,
    loading: teams.loading || players.loading,
    error: teams.error || players.error,
  };
}

export function useRegistrationTeam(teamId: string | undefined): { data: Team | null; loading: boolean; error: string | null } {
  const teams = usePathCollection<RegisteredTeam>(defaultDb, teamsPath);
  const players = usePathCollection<RegisteredPlayer>(
    defaultDb,
    playersPath,
    teamId ? [where("teamId", "==", teamId)] : []
  );
  const rosterCheckIns = useCollection<RosterCheckIn>(
    COLLECTIONS.rosterCheckIns,
    teamId ? [where("teamId", "==", teamId)] : []
  );
  const categories = useCollection<Category>(COLLECTIONS.categories);
  const [appOverlay, setAppOverlay] = useState<Pick<Team, "stats" | "group" | "color" | "sponsorId" | "coachManagerUids"> | null>(null);

  useEffect(() => {
    if (!teamId) {
      setAppOverlay(null);
      return;
    }
    return onSnapshot(
      doc(db, COLLECTIONS.teams, teamId),
      (snap) => {
        if (!snap.exists()) {
          setAppOverlay(null);
          return;
        }
        const t = snap.data() as Team;
        setAppOverlay({ stats: t.stats, group: t.group, color: t.color, sponsorId: t.sponsorId, coachManagerUids: t.coachManagerUids });
      },
      () => setAppOverlay(null)
    );
  }, [teamId]);

  const data = useMemo(() => {
    if (!teamId) return null;
    const team = teams.data.find((t) => t.id === teamId);
    if (!team) return null;
    return buildTeamFromRegistration(team, players.data, rosterCheckIns.data, categories.data, appOverlay);
  }, [teamId, teams.data, players.data, rosterCheckIns.data, categories.data, appOverlay]);

  return {
    data,
    loading: !teamId ? false : teams.loading || players.loading,
    error: teams.error || players.error,
  };
}

/**
 * Team ids a given account is an admin-designated coach/manager for
 * (Team.coachManagerUids — see assignTeamManager). Independent of
 * registration/playerOf data, since a coach/manager isn't necessarily a
 * registered player themselves — this is how the dashboard finds which
 * team(s) to show "managed team" tools for.
 */
export function useMyManagedTeamIds(uid: string | undefined): { data: string[]; loading: boolean } {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, COLLECTIONS.teams), where("coachManagerUids", "array-contains", uid));
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => d.id));
        setLoading(false);
      },
      (err) => {
        console.error("useMyManagedTeamIds snapshot error:", err);
        setData([]);
        setLoading(false);
      }
    );
  }, [uid]);

  return { data, loading };
}

/**
 * True if this account is a real registration captain of any team
 * (profile.playerOf[].isCaptain) or an admin-designated coach/manager of any
 * team (useMyManagedTeamIds). Gates the "Report an issue to the
 * commissioner" flow — it's the same $35 complaint fileIncident's
 * captain_complaint path files, just a different entry point, so it's
 * restricted to the same audience (enforced server-side too, in
 * createReportFeeIntent/filePaidReport — this is just for the UI).
 */
export function useCanFileCommissionerReport(uid: string | undefined, profile: UserProfile | null | undefined): boolean {
  const { data: managedTeamIds } = useMyManagedTeamIds(uid);
  const isCaptain = (profile?.playerOf ?? []).some((m) => m.isCaptain);
  return isCaptain || managedTeamIds.length > 0;
}
