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
    if (appUser) {
      // appUser normally wins outright — but a `users/{uid}` doc created
      // without ever seeing this uid's real registrations (e.g. a parent who
      // used the app's own Sign Up form) permanently masks those
      // registrations otherwise, even though regPlayers (matched by uid,
      // independent of appUser) found them just fine. Only fills in when
      // appUser's own playerOf is empty — never overwrites a populated one,
      // so an intentionally-crafted seed/test profile is untouched.
      if (!appUser.playerOf?.length && regPlayers.length > 0) {
        const playerOf = playerMembershipsFromRegisteredPlayers(
          uid,
          regPlayers,
          teamCaptainByTeamId,
          appointedCaptainKeysByTeamId
        );
        if (playerOf.length > 0) {
          return { profile: { ...appUser, playerOf }, profileSource: "umoja13" as const, loading };
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
