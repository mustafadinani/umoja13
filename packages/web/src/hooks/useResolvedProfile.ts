import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import {
  COLLECTIONS,
  DATA_SOURCES,
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  mapOutreachProfileToUserProfile,
  type OutreachProfile,
  type ProfileSource,
  type RegisteredPlayer,
  type UserProfile,
} from "@umoja/shared";
import { db, defaultDb } from "../lib/firebase";

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

  return useMemo(() => {
    if (!uid) return { profile: null, profileSource: null, loading: false };
    const loading = !appReady || !outreachReady || !playersReady;
    if (appUser) {
      return { profile: appUser, profileSource: "umoja13" as const, loading };
    }
    if (outreachRaw) {
      return {
        profile: mapOutreachProfileToUserProfile(uid, outreachRaw, regPlayers),
        profileSource: "default" as const,
        loading,
      };
    }
    return { profile: null, profileSource: null, loading };
  }, [uid, appUser, outreachRaw, regPlayers, appReady, outreachReady, playersReady]);
}
