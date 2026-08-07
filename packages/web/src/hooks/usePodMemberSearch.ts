import { useEffect, useMemo, useState } from "react";
import { useAllUsers } from "./useData";
import { useRegisteredPlayers } from "./useRegistration";
import { lookupUserByEmail } from "../lib/callables";

export interface PodMemberCandidate {
  uid: string;
  displayName: string;
  sublabel: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared search-for-a-person logic behind every "add someone to a pod"
 * surface (the full pod editor, and the unified Add People modal on the pod
 * detail view) — three sources, since most real people in this org
 * aren't `users` docs at all:
 *  - umoja13-app `users` (staff/volunteers who've used the tournament app)
 *  - Outreach `playersRegistered` (every real registered player already
 *    carries a Firebase Auth uid, so these are safe to add directly)
 *  - direct email lookup (for family managers/parents, who only exist in
 *    Outreach data as an email with no name to search by)
 * `memberUids` excludes people already on the pod from name-search results
 * (the caller decides what "already added" means — a live pod's persisted
 * roster, or a not-yet-saved draft).
 */
export function usePodMemberSearch(memberUids: string[]) {
  const { data: users } = useAllUsers();
  const { data: registeredPlayers } = useRegisteredPlayers();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [emailLookup, setEmailLookup] = useState<{ status: "idle" | "loading" | "done"; result: PodMemberCandidate | null }>({
    status: "idle",
    result: null,
  });
  const [foundByEmail, setFoundByEmail] = useState<PodMemberCandidate[]>([]);

  // Debounced so the ~1050-candidate filter (users + every registered player)
  // runs once per pause in typing, not synchronously on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const nameByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) map.set(u.uid, u.displayName);
    for (const p of registeredPlayers) {
      if (p.uid && !map.has(p.uid)) map.set(p.uid, `${p.firstName} ${p.lastName}`.trim());
    }
    for (const c of foundByEmail) if (!map.has(c.uid)) map.set(c.uid, c.displayName);
    return map;
  }, [users, registeredPlayers, foundByEmail]);

  // A person's role, for telling "members" (anyone slotted into this
  // staffing zone) apart from "volunteers" (a specific role) at a glance —
  // a pod member can just as easily be an admin, commissioner, or referee.
  const roleByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) map.set(u.uid, u.primaryRole);
    for (const p of registeredPlayers) if (p.uid && !map.has(p.uid)) map.set(p.uid, "player");
    return map;
  }, [users, registeredPlayers]);

  const searchableUsers = useMemo(
    () => users.map((u) => ({ uid: u.uid, displayName: u.displayName, sublabel: u.primaryRole, needle: u.displayName.toLowerCase() })),
    [users]
  );
  const searchablePlayers = useMemo(
    () =>
      registeredPlayers
        .filter((p) => !!p.uid)
        .map((p) => {
          const displayName = `${p.firstName} ${p.lastName}`.trim();
          return { uid: p.uid, displayName, sublabel: "registered player", needle: displayName.toLowerCase() };
        }),
    [registeredPlayers]
  );

  const nameResults: PodMemberCandidate[] = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return [];
    const fromUsers = searchableUsers.filter((u) => u.needle.includes(needle));
    const seen = new Set(fromUsers.map((c) => c.uid));
    const fromPlayers = searchablePlayers.filter((p) => !seen.has(p.uid) && p.needle.includes(needle));
    return [...fromUsers, ...fromPlayers].filter((c) => !memberUids.includes(c.uid)).slice(0, 8);
  }, [debouncedSearch, searchableUsers, searchablePlayers, memberUids]);

  const looksLikeEmail = EMAIL_RE.test(search.trim());

  async function runEmailLookup() {
    const email = search.trim();
    if (!EMAIL_RE.test(email)) return;
    setEmailLookup({ status: "loading", result: null });
    try {
      const res = await lookupUserByEmail({ email });
      const user = res.data.user;
      if (user) {
        const candidate: PodMemberCandidate = { uid: user.uid, displayName: user.displayName, sublabel: user.email };
        setFoundByEmail((prev) => (prev.some((c) => c.uid === candidate.uid) ? prev : [...prev, candidate]));
        setEmailLookup({ status: "done", result: candidate });
      } else {
        setEmailLookup({ status: "done", result: null });
      }
    } catch {
      setEmailLookup({ status: "done", result: null });
    }
  }

  function resetSearch() {
    setSearch("");
    setEmailLookup({ status: "idle", result: null });
  }

  // Any edit to the query invalidates a previous email lookup's result —
  // otherwise a stale "found"/"not found" panel lingers under a query the
  // user has since changed.
  function updateSearch(value: string) {
    setSearch(value);
    setEmailLookup({ status: "idle", result: null });
  }

  return { search, setSearch: updateSearch, nameResults, emailLookup, runEmailLookup, looksLikeEmail, nameByUid, roleByUid, resetSearch };
}

const ROLE_LABELS: Record<string, string> = {
  fan: "Fan",
  player: "Player",
  captain: "Captain",
  volunteer: "Volunteer",
  referee: "Referee",
  commissioner: "Commissioner",
  admin: "Admin",
};

/** Display label for a member/candidate's role — distinct from "no app role yet" (found only by email, never signed into the tournament app). */
export function podRoleLabel(role: string | undefined): string {
  if (!role) return "no app role yet";
  return ROLE_LABELS[role] ?? role;
}
