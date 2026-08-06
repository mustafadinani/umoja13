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

export function useRegisteredPlayers() {
  return usePathCollection<RegisteredPlayer>(defaultDb, playersPath);
}

export function useRegisteredTeamsRaw() {
  return usePathCollection<RegisteredTeam>(defaultDb, teamsPath);
}

/** Category pills with team counts — same buckets as web Admin Teams + Standings. */
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

export function useRegistrationTeams(categoryId?: string): { data: Team[]; loading: boolean; error: string | null } {
  const teams = useRegisteredTeamsRaw();
  const players = useRegisteredPlayers();
  const rosterCheckIns = useCollection<RosterCheckIn>(COLLECTIONS.rosterCheckIns);
  const categories = useCollection<Category>(COLLECTIONS.categories);
  const appTeams = useCollection<Team>(COLLECTIONS.teams);

  const data = useMemo(() => {
    const appById = new Map(
      appTeams.data.map((t) => [
        t.id,
        { stats: t.stats, group: t.group, color: t.color, sponsorId: t.sponsorId },
      ])
    );
    return buildTeamsFromRegistration(
      teams.data,
      players.data,
      categoryId,
      rosterCheckIns.data,
      categories.data,
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
  const [appOverlay, setAppOverlay] = useState<Pick<Team, "stats" | "group" | "color" | "sponsorId"> | null>(null);

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
        setAppOverlay({ stats: t.stats, group: t.group, color: t.color, sponsorId: t.sponsorId });
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
