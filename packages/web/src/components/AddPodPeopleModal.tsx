import { useEffect, useMemo, useRef, useState } from "react";
import type { Pod } from "@umoja/shared";
import { theme } from "../lib/theme";
import { colorForSeed } from "../lib/podColors";
import { useAllUsers, useGames } from "../hooks/useData";
import { usePodMemberSearch, podRoleLabel } from "../hooks/usePodMemberSearch";
import { addPodVolunteer, getRecruitableVolunteers, updatePod } from "../lib/callables";
import { Avatar, Modal, PrimaryButton } from "./ui";

interface Suggestion {
  uid: string;
  displayName: string;
  reason: string;
}

/**
 * The one "add people to this pod" flow, replacing what used to be two
 * separate mechanisms living in two separate places (a general search box on
 * the admin tab, and a volunteer-only "Recruit" button buried in Shifts).
 * Staff get full control — search anyone, remove members. A pod's own
 * volunteer members get a narrower version — recruit fellow volunteers only,
 * view (but not remove) the roster — mirroring what RecruitVolunteerModal
 * used to gate on its own.
 */
export function AddPodPeopleModal({
  pod,
  canManage,
  onClose,
}: {
  pod: Pod;
  canManage: boolean;
  onClose: () => void;
}) {
  const { data: users } = useAllUsers();
  const { data: games } = useGames();
  const { search, setSearch, nameResults, emailLookup, runEmailLookup, looksLikeEmail, nameByUid, roleByUid, resetSearch } =
    usePodMemberSearch(pod.memberUids);

  const [recruitCandidates, setRecruitCandidates] = useState<{ uid: string; displayName: string }[] | null>(null);
  const [addedUids, setAddedUids] = useState<Set<string>>(new Set());
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The `pod` prop only refreshes once Firestore's listener round-trips back
  // after our own write — too slow for "Add all"'s sequential loop, which
  // would otherwise read the same stale memberUids on every iteration and
  // have each updatePod call clobber the one before it. This ref is the
  // running "what we believe the server has" list for this modal session.
  const pendingMemberUidsRef = useRef<string[]>(pod.memberUids);

  useEffect(() => {
    getRecruitableVolunteers({ podId: pod.id })
      .then((res) => setRecruitCandidates(res.data.candidates))
      .catch(() => setRecruitCandidates([]));
  }, [pod.id]);

  // Referees scheduled on this pod's fields but not on the roster yet — a staff-only
  // suggestion, since pulling in a referee (vs. just a volunteer) is a fuller roster call.
  const refereeSuggestions: Suggestion[] = useMemo(() => {
    if (!canManage || pod.fields.length === 0) return [];
    const uids = new Set<string>();
    for (const g of games) {
      if (!pod.fields.includes(g.field)) continue;
      for (const refUid of g.refereeUids ?? []) {
        if (!pod.memberUids.includes(refUid)) uids.add(refUid);
      }
    }
    return [...uids]
      .map((uid) => users.find((u) => u.uid === uid))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({ uid: u.uid, displayName: u.displayName, reason: "scheduled on this pod's fields" }));
  }, [canManage, pod.fields, pod.memberUids, games, users]);

  const volunteerSuggestions: Suggestion[] = (recruitCandidates ?? []).map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    reason: "registered volunteer, not yet placed",
  }));

  const suggestions = [...refereeSuggestions, ...volunteerSuggestions].filter((s) => !addedUids.has(s.uid));

  const recruitSearch = search.trim().toLowerCase();
  const visibleRecruitCandidates = !canManage
    ? (recruitCandidates ?? []).filter((c) => !pod.memberUids.includes(c.uid) && !addedUids.has(c.uid) && c.displayName.toLowerCase().includes(recruitSearch))
    : [];

  async function addPerson(uid: string) {
    setBusyUid(uid);
    setError(null);
    try {
      if (canManage) {
        const next = [...pendingMemberUidsRef.current, uid];
        await updatePod({ podId: pod.id, memberUids: next });
        pendingMemberUidsRef.current = next;
      } else {
        // Server-side arrayUnion — safe to call back-to-back without this same race.
        await addPodVolunteer({ podId: pod.id, uidToAdd: uid });
      }
      setAddedUids((prev) => new Set(prev).add(uid));
      resetSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this person.");
    } finally {
      setBusyUid(null);
    }
  }

  async function addAllSuggested() {
    for (const s of suggestions) {
      if (!addedUids.has(s.uid)) await addPerson(s.uid);
    }
  }

  async function removeMember(uid: string) {
    const next = pendingMemberUidsRef.current.filter((u) => u !== uid);
    await updatePod({ podId: pod.id, memberUids: next });
    pendingMemberUidsRef.current = next;
  }

  const emailAlreadyAMember = emailLookup.result ? pod.memberUids.includes(emailLookup.result.uid) : false;

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        Add people to {pod.name}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        {canManage ? "Search anyone, or add a suggested match with one tap." : "Add a fellow volunteer to this pod."}
      </div>

      {error && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canManage && looksLikeEmail && runEmailLookup()}
          placeholder={canManage ? "Search by name, or paste an email…" : "Search volunteers…"}
          style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        {canManage && looksLikeEmail && (
          <button
            onClick={runEmailLookup}
            disabled={emailLookup.status === "loading"}
            style={{ padding: "0 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, fontWeight: 700, background: "none", cursor: "pointer" }}
          >
            {emailLookup.status === "loading" ? "Looking up…" : "Look up"}
          </button>
        )}
      </div>

      {canManage && nameResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {nameResults.map((c) => (
            <PersonRow
              key={c.uid}
              uid={c.uid}
              name={c.displayName}
              sublabel={podRoleLabel(roleByUid.get(c.uid))}
              busy={busyUid === c.uid}
              onAdd={() => addPerson(c.uid)}
            />
          ))}
        </div>
      )}

      {canManage && emailLookup.status === "done" && (
        <div style={{ marginBottom: 12 }}>
          {emailLookup.result ? (
            <PersonRow
              uid={emailLookup.result.uid}
              name={emailLookup.result.displayName}
              sublabel={emailAlreadyAMember ? "already added" : emailLookup.result.sublabel}
              busy={busyUid === emailLookup.result.uid}
              added={emailAlreadyAMember}
              onAdd={() => addPerson(emailLookup.result!.uid)}
            />
          ) : (
            <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No account found for that email.</div>
          )}
        </div>
      )}

      {!canManage && search.trim() && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {visibleRecruitCandidates.map((c) => (
            <PersonRow key={c.uid} uid={c.uid} name={c.displayName} sublabel="registered volunteer" busy={busyUid === c.uid} onAdd={() => addPerson(c.uid)} />
          ))}
          {visibleRecruitCandidates.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No volunteers match "{search}".</div>}
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: theme.color.textMuted }}>SUGGESTED FOR THIS POD</div>
            <button onClick={addAllSuggested} style={{ background: "none", border: "none", color: theme.color.purple, fontWeight: 700, fontSize: 11.5, cursor: "pointer", padding: 0 }}>
              Add all
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {suggestions.map((s) => (
              <PersonRow key={s.uid} uid={s.uid} name={s.displayName} sublabel={s.reason} busy={busyUid === s.uid} onAdd={() => addPerson(s.uid)} compact />
            ))}
          </div>
        </div>
      )}

      <hr style={{ border: "none", borderTop: `1px solid ${theme.color.border}`, margin: "16px 0" }} />

      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: theme.color.textMuted, marginBottom: 8 }}>
        CURRENT MEMBERS ({pod.memberUids.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
        {pod.memberUids.map((uid) => {
          const name = nameByUid.get(uid) ?? uid;
          return (
            <div key={uid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Avatar name={name} size={26} color={colorForSeed(uid)} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.color.textMuted }}>{podRoleLabel(roleByUid.get(uid))}</div>
                </div>
              </div>
              {canManage && (
                <button onClick={() => removeMember(uid)} title="Remove" style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 13, padding: 4, cursor: "pointer" }}>
                  ✕
                </button>
              )}
            </div>
          );
        })}
        {pod.memberUids.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5, padding: "8px 0" }}>No one's here yet.</div>}
      </div>

      <div style={{ marginTop: 18, textAlign: "right" }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
        >
          DONE
        </button>
      </div>
    </Modal>
  );
}

function PersonRow({
  uid, name, sublabel, busy, added, onAdd, compact,
}: { uid: string; name: string; sublabel: string; busy: boolean; added?: boolean; onAdd: () => void; compact?: boolean }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        padding: compact ? "6px 0" : "8px 10px",
        borderRadius: theme.radius.sm,
        border: compact ? "none" : `1px solid ${theme.color.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        {!compact && <Avatar name={name} size={26} color={colorForSeed(uid)} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ fontSize: 11, color: theme.color.textMuted }}>{sublabel}</div>
        </div>
      </div>
      {added ? (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.color.success }}>Added</span>
      ) : (
        <PrimaryButton disabled={busy} onClick={onAdd} style={{ padding: "5px 12px", fontSize: 11.5, background: theme.color.purple }}>
          {busy ? "…" : "+ Add"}
        </PrimaryButton>
      )}
    </div>
  );
}
