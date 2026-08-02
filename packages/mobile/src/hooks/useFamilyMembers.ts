import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  DATA_SOURCES,
  parseFamilyMemberRefs,
  pickFamilyMemberPhoto,
  type FamilyDoc,
  type FamilyMemberProfile,
  type OutreachProfile,
} from "@umoja/shared";
import { defaultDb } from "../lib/firebase";

const LOG = "[family-photos]";

function flog(...args: unknown[]) {
  console.warn(LOG, ...args);
}

function displayNameFromProfile(raw: OutreachProfile, fallback: string): string {
  if (raw.displayName?.trim()) return raw.displayName.trim();
  if (raw.fullName?.trim()) return raw.fullName.trim();
  if (raw.name?.trim()) return raw.name.trim();
  const combined = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  return raw.email?.split("@")[0] || fallback;
}

function photoFromProfile(raw: OutreachProfile): string | undefined {
  return raw.profilePicture || raw.photoUrl || raw.photoURL || undefined;
}

/**
 * Family photos:
 * 1. `(default)/profiles/{firebaseUid}.family` → familyId
 * 2. `(default)/families/{familyId}.members[].id` → memberId
 * 3. `(default)/profiles/{memberId}.profilePicture` → photo
 * 4. Prefer registration profileId ↔ members[].id, then name, then account
 */
export function useFamilyMembers(uid: string | undefined): {
  members: FamilyMemberProfile[];
  familyId: string | null;
  loading: boolean;
  error: string | null;
  pickForPlayer: (
    playerName: string | undefined,
    accountUid: string | undefined,
    preferredProfileIds?: string[]
  ) => FamilyMemberProfile | undefined;
} {
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      flog("skip — no uid");
      setMembers([]);
      setFamilyId(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    flog("start", { uid });

    (async () => {
      try {
        const profileRef = doc(defaultDb, DATA_SOURCES.registration.profilesCollection, uid);
        flog("step 1/4 — reading profile", { path: profileRef.path });
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          flog("step 1/4 FAIL — profile missing");
          if (!cancelled) {
            setMembers([]);
            setFamilyId(null);
          }
          return;
        }

        const profile = profileSnap.data() as OutreachProfile;
        const resolvedFamilyId = typeof profile.family === "string" ? profile.family.trim() : "";
        flog("step 1/4 OK", { family: resolvedFamilyId || null });

        if (!resolvedFamilyId) {
          flog("step 1/4 STOP — no family field");
          if (!cancelled) {
            setMembers([]);
            setFamilyId(null);
          }
          return;
        }

        const familyRef = doc(defaultDb, DATA_SOURCES.registration.familyCollection, resolvedFamilyId);
        flog("step 2/4 — reading family", { path: familyRef.path });
        const familySnap = await getDoc(familyRef);
        if (!familySnap.exists()) {
          flog("step 2/4 FAIL — family missing");
          if (!cancelled) {
            setMembers([]);
            setFamilyId(resolvedFamilyId);
            setError(`Family ${resolvedFamilyId} not found.`);
          }
          return;
        }

        const familyData = familySnap.data() as Omit<FamilyDoc, "id">;
        const parsed = parseFamilyMemberRefs(familyData.members);
        flog("step 2/4 OK", {
          memberIds: parsed.map((m) => m.id),
          rawMembers: familyData.members,
        });

        if (parsed.length === 0) {
          flog("step 2/4 STOP — no members");
          if (!cancelled) {
            setFamilyId(resolvedFamilyId);
            setMembers([]);
          }
          return;
        }

        flog("step 3/4 — loading profiles/{memberId}");
        const enriched: FamilyMemberProfile[] = await Promise.all(
          parsed.map(async (m) => {
            const memberProfileRef = doc(
              defaultDb,
              DATA_SOURCES.registration.profilesCollection,
              m.id
            );
            try {
              const snap = await getDoc(memberProfileRef);
              if (!snap.exists()) {
                flog("step 3/4 — profiles/{memberId} missing", {
                  memberId: m.id,
                  path: memberProfileRef.path,
                });
                return {
                  id: m.id,
                  matchIds: m.matchIds,
                  displayName: m.displayName,
                  email: m.email,
                } satisfies FamilyMemberProfile;
              }
              const raw = snap.data() as OutreachProfile;
              const photoUrl = photoFromProfile(raw);
              flog("step 3/4 — profiles/{memberId}", {
                memberId: m.id,
                path: memberProfileRef.path,
                displayName: displayNameFromProfile(raw, m.id),
                hasPhoto: !!photoUrl,
                photoUrl: photoUrl ?? null,
                profilePicture: raw.profilePicture ?? null,
              });
              return {
                id: m.id,
                matchIds: m.matchIds,
                displayName: displayNameFromProfile(raw, m.displayName || m.id),
                photoUrl,
                email: raw.email || m.email,
              } satisfies FamilyMemberProfile;
            } catch (err) {
              flog("step 3/4 — profiles/{memberId} error", { memberId: m.id, err });
              return {
                id: m.id,
                matchIds: m.matchIds,
                displayName: m.displayName,
                email: m.email,
              } satisfies FamilyMemberProfile;
            }
          })
        );

        if (cancelled) return;
        flog("step 3/4 OK", {
          loadedCount: enriched.length,
          withPhotos: enriched.filter((m) => !!m.photoUrl).length,
          members: enriched.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            hasPhoto: !!m.photoUrl,
          })),
        });
        setFamilyId(resolvedFamilyId);
        setMembers(enriched);
      } catch (err) {
        console.error(LOG, "FAILED", err);
        if (!cancelled) {
          setMembers([]);
          setFamilyId(null);
          setError(err instanceof Error ? err.message : "Couldn't load family.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const pickForPlayer = useMemo(
    () =>
      (playerName: string | undefined, accountUid: string | undefined, preferredProfileIds: string[] = []) => {
        const picked = pickFamilyMemberPhoto(members, playerName, accountUid, preferredProfileIds);
        flog("step 4/4 — pickForPlayer", {
          playerName,
          preferredProfileIds,
          membersAvailable: members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            hasPhoto: !!m.photoUrl,
          })),
          picked: picked
            ? { id: picked.id, displayName: picked.displayName, photoUrl: picked.photoUrl ?? null }
            : null,
        });
        return picked;
      },
    [members]
  );

  return { members, familyId, loading, error, pickForPlayer };
}
