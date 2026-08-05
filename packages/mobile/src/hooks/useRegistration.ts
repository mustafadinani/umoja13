import { useEffect, useMemo, useState } from "react";
import {
  collection,
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
  buildTeamFromRegistration,
  buildTeamsFromRegistration,
  type RegisteredPlayer,
  type RegisteredTeam,
  type RosterCheckIn,
  type Team,
} from "@umoja/shared";
import { defaultDb } from "../lib/firebase";
import { useCollection } from "./firestore";

function usePathCollection<T extends DocumentData>(
  db: Firestore,
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
    const col = collection(db, path[0], path[1], path[2]);
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
  }, [db, pathKey, constraintKey]);

  return { data, loading, error };
}

const teamsPath = [REGISTRATION_ROOT, REGISTRATION_YEAR, TEAMS_REGISTERED] as [string, string, string];
const playersPath = [REGISTRATION_ROOT, REGISTRATION_YEAR, PLAYERS_REGISTERED] as [string, string, string];

/** Live teams + players from `(default)` / uGames/2026, shaped as Team for the UI. */
export function useRegistrationTeams(categoryId?: string): { data: Team[]; loading: boolean; error: string | null } {
  const teams = usePathCollection<RegisteredTeam>(defaultDb, teamsPath);
  const players = usePathCollection<RegisteredPlayer>(defaultDb, playersPath);
  const rosterCheckIns = useCollection<RosterCheckIn>(COLLECTIONS.rosterCheckIns);
  const data = useMemo(
    () => buildTeamsFromRegistration(teams.data, players.data, categoryId, rosterCheckIns.data),
    [teams.data, players.data, categoryId, rosterCheckIns.data]
  );
  return {
    data,
    loading: teams.loading || players.loading,
    error: teams.error || players.error,
  };
}

export function useRegistrationTeam(teamId: string | undefined): { data: Team | null; loading: boolean; error: string | null } {
  const teams = usePathCollection<RegisteredTeam>(defaultDb, teamsPath);
  // Prefer a scoped query — full collection lists are often blocked by (default) rules
  // for playersRegistered (PII), while teamId equality queries are allowed.
  const players = usePathCollection<RegisteredPlayer>(
    defaultDb,
    playersPath,
    teamId ? [where("teamId", "==", teamId)] : []
  );
  const rosterCheckIns = useCollection<RosterCheckIn>(
    COLLECTIONS.rosterCheckIns,
    teamId ? [where("teamId", "==", teamId)] : []
  );
  const data = useMemo(() => {
    if (!teamId) return null;
    const team = teams.data.find((t) => t.id === teamId);
    if (!team) return null;
    return buildTeamFromRegistration(team, players.data, rosterCheckIns.data);
  }, [teamId, teams.data, players.data, rosterCheckIns.data]);
  return {
    data,
    loading: !teamId ? false : teams.loading || players.loading,
    error: teams.error || players.error,
  };
}
