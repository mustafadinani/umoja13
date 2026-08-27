import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import {
  COLLECTIONS,
  DATA_SOURCES,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  mapOutreachProfileToUserProfile,
  playerMembershipsFromRegisteredPlayers,
  type OutreachProfile,
  type ProfileSource,
  type RegisteredPlayer,
  type RosterCheckIn,
  type UserProfile,
} from "@umoja/shared";
import { db, defaultDb } from "../lib/firebase";
import { useRegisteredTeamsRaw } from "./useRegistration";

/**
 * Resolve the signed-in user's app profile from either:
 * - umoja13-app / users/{uid}  (seed / test accounts), or
 * - (default) / profiles/{uid} (Outreach / registration users),
 * which are mutually exclusive. Registration players enrich Outreach profiles.
 */
export function useResolvedProfile(uid: string | undefined): {
  profile: UserProfile | null;
  profileSource: ProfileSource | null;
  loading: boolean;
} {
  const [appUser, setAppUser] = useState<UserProfile | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [outreachRaw, setOutreachRaw] = useState<OutreachProfile | null>(null);
  const [outreachReady, setOutreachReady] = useState(false);
  const [regPlayers, setRegPlayers] = useState<RegisteredPlayer[]>([]);
  const [playersReady, setPlayersReady] = useState(false);
  // Needed to correctly compute isCaptain on Outreach-derived profiles — see
  // mapOutreachProfileToUserProfile's teamCaptainByTeamId param.
  const { data: registeredTeams } = useRegisteredTeamsRaw();
  const teamCaptainByTeamId = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const t of registeredTeams) map.set(t.id, t.captainProfileId ?? t.uid);
    return map;
  }, [registeredTeams]);

  useEffect(() => {
    if (!uid) {
      setAppUser(null);
      setAppReady(true);
      return;
    }
    setAppReady(false);
    return onSnapshot(
      doc(db, COLLECTIONS.users, uid),
      (snap) => {
        setAppUser(snap.exists() ? ({ ...(snap.data() as UserProfile), uid: snap.id }) : null);
        setAppReady(true);
      },
      (err) => {
        console.error("umoja13 users profile snapshot error:", err);
        setAppUser(null);
        setAppReady(true);
      }
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setOutreachRaw(null);
      setOutreachReady(true);
      return;
    }
    setOutreachReady(false);
    return onSnapshot(
      doc(defaultDb, DATA_SOURCES.registration.profilesCollection, uid),
      (snap) => {
        setOutreachRaw(snap.exists() ? (snap.data() as OutreachProfile) : null);
        setOutreachReady(true);
      },
      (err) => {
        console.error("default profiles snapshot error:", err);
        setOutreachRaw(null);
        setOutreachReady(true);
      }
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setRegPlayers([]);
      setPlayersReady(true);
      return;
    }
    setPlayersReady(false);
    const q = query(
      collection(defaultDb, REGISTRATION_ROOT, REGISTRATION_YEAR, PLAYERS_REGISTERED),
      where("uid", "==", uid)
    );
    return onSnapshot(
      q,
      (snap) => {
        setRegPlayers(snap.docs.map((d) => ({ ...(d.data() as RegisteredPlayer), id: d.id })));
        setPlayersReady(true);
      },
      (err) => {
        console.error("playersRegistered-by-uid snapshot error:", err);
        setRegPlayers([]);
        setPlayersReady(true);
      }
    );
  }, [uid]);

  // This account's own per-child playerKeys (see RosterEntry.playerKey) —
  // used below to find any rosterCheckIns overlay docs a coach/manager has
  // appointed one of them captain on. Small (a handful of kids at most), so
  // a single Firestore "in" query (30-value limit) is always enough.
  const myPlayerKeys = useMemo(
    () => Array.from(new Set(regPlayers.map((p) => p.profileId?.trim() || p.id))),
    [regPlayers]
  );
  const [appointedCaptainDocs, setAppointedCaptainDocs] = useState<RosterCheckIn[]>([]);
  useEffect(() => {
    if (myPlayerKeys.length === 0) {
      setAppointedCaptainDocs([]);
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.rosterCheckIns),
      where("userId", "in", myPlayerKeys),
      where("appointedCaptain", "==", true)
    );
    return onSnapshot(
      q,
      (snap) => setAppointedCaptainDocs(snap.docs.map((d) => d.data() as RosterCheckIn)),
      (err) => {
        console.error("rosterCheckIns appointedCaptain snapshot error:", err);
        setAppointedCaptainDocs([]);
      }
    );
  }, [myPlayerKeys]);
  const appointedCaptainKeysByTeamId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of appointedCaptainDocs) {
      if (!map.has(c.teamId)) map.set(c.teamId, new Set());
      map.get(c.teamId)!.add(c.userId);
    }
    return map;
  }, [appointedCaptainDocs]);

  return useMemo(() => {
    if (!uid) return { profile: null, profileSource: null, loading: false };
    const loading = !appReady || !outreachReady || !playersReady;
    // Prefer seed/test users on umoja13-app when present (mutually exclusive with Outreach) —
    // but a `users/{uid}` doc created without ever seeing this uid's real
    // registrations (e.g. a parent who used the app's own Sign Up form)
    // permanently masks those registrations otherwise, even though
    // regPlayers (matched by uid, independent of appUser) found them just
    // fine.
    //
    // This used to only fill in when appUser.playerOf was completely
    // empty — which meant a registration added AFTER the account already
    // had one real membership (e.g. a parent who's also registered as a
    // player themselves, on the same account as their kid) never made it
    // into playerOf at all: the account's existing non-empty array
    // permanently masked it, with no error and no trace anywhere — the
    // person just had no Check-In entry point for their own registration.
    // Reconciling per-entry (add whatever's missing, by teamId+profileId,
    // never touch what's already there) fixes that while still leaving an
    // intentionally-crafted seed/test profile with no real registrations at
    // all (regPlayers.length === 0) completely untouched.
    if (appUser) {
      if (regPlayers.length > 0) {
        const freshPlayerOf = playerMembershipsFromRegisteredPlayers(
          uid,
          regPlayers,
          teamCaptainByTeamId,
          appointedCaptainKeysByTeamId
        );
        const existingKeys = new Set((appUser.playerOf ?? []).map((m) => `${m.teamId}:${m.profileId ?? ""}`));
        const missing = freshPlayerOf.filter((m) => !existingKeys.has(`${m.teamId}:${m.profileId ?? ""}`));
        if (missing.length > 0) {
          return {
            profile: { ...appUser, playerOf: [...(appUser.playerOf ?? []), ...missing] },
            profileSource: "umoja13" as const,
            loading,
          };
        }
      }
      return { profile: appUser, profileSource: "umoja13" as const, loading };
    }
    if (outreachRaw) {
      return {
        profile: mapOutreachProfileToUserProfile(
          uid,
          outreachRaw,
          regPlayers,
          teamCaptainByTeamId,
          appointedCaptainKeysByTeamId
        ),
        profileSource: "default" as const,
        loading,
      };
    }
    return { profile: null, profileSource: null, loading };
  }, [
    uid,
    appUser,
    outreachRaw,
    regPlayers,
    teamCaptainByTeamId,
    appointedCaptainKeysByTeamId,
    appReady,
    outreachReady,
    playersReady,
  ]);
}
