import { useEffect, useMemo, useState } from "react";
import { FIELDS, type Pod } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllUsers } from "../../../hooks/useData";
import { useRegisteredPlayers } from "../../../hooks/useRegistration";
import { createPod, updatePod, lookupUserByEmail } from "../../../lib/callables";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";

interface Candidate {
  uid: string;
  displayName: string;
  sublabel: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create or edit a Pod: name, field coverage, and member roster. Membership
 * search covers three sources, since most real people in this org aren't
 * `users` docs at all — that collection is only people who've signed into
 * the umoja13-app tournament features specifically:
 *  - umoja13-app `users` (staff/volunteers who've used the tournament app)
 *  - Outreach `playersRegistered` (every real registered player already
 *    carries a Firebase Auth uid, so these are safe to add directly)
 *  - direct email lookup (for family managers/parents, who only exist in
 *    Outreach data as an email on `families.managers` with no name to
 *    search by — you look them up by the one identifier that's reliable)
 * Editing the General pod's fields/name is allowed, but it can never be
 * deleted (handled by the caller, not here).
 */
export function PodEditorModal({ pod, onClose }: { pod?: Pod; onClose: () => void }) {
  const { data: users } = useAllUsers();
  const { data: registeredPlayers } = useRegisteredPlayers();

  const [name, setName] = useState(pod?.name ?? "");
  const [fields, setFields] = useState<string[]>(pod?.fields ?? []);
  const [memberUids, setMemberUids] = useState<string[]>(pod?.memberUids ?? []);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailLookup, setEmailLookup] = useState<{ status: "idle" | "loading" | "done"; result: Candidate | null }>({ status: "idle", result: null });
  const [foundByEmail, setFoundByEmail] = useState<Candidate[]>([]);

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

  // Pre-lowercase once per data change, not once per keystroke.
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

  const nameResults: Candidate[] = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return [];
    const fromUsers = searchableUsers.filter((u) => u.needle.includes(needle));
    const seen = new Set(fromUsers.map((c) => c.uid));
    const fromPlayers = searchablePlayers.filter((p) => !seen.has(p.uid) && p.needle.includes(needle));
    return [...fromUsers, ...fromPlayers].filter((c) => !memberUids.includes(c.uid)).slice(0, 8);
  }, [debouncedSearch, searchableUsers, searchablePlayers, memberUids]);

  async function runEmailLookup() {
    const email = search.trim();
    if (!EMAIL_RE.test(email)) return;
    setEmailLookup({ status: "loading", result: null });
    try {
      const res = await lookupUserByEmail({ email });
      const user = res.data.user;
      if (user) {
        const candidate: Candidate = { uid: user.uid, displayName: user.displayName, sublabel: user.email };
        setFoundByEmail((prev) => (prev.some((c) => c.uid === candidate.uid) ? prev : [...prev, candidate]));
        setEmailLookup({ status: "done", result: candidate });
      } else {
        setEmailLookup({ status: "done", result: null });
      }
    } catch {
      setEmailLookup({ status: "done", result: null });
    }
  }

  function toggleField(f: string) {
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function addMember(uid: string) {
    setMemberUids((prev) => [...prev, uid]);
    setSearch("");
    setEmailLookup({ status: "idle", result: null });
  }

  function removeMember(uid: string) {
    setMemberUids((prev) => prev.filter((u) => u !== uid));
  }

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (pod) {
        await updatePod({ podId: pod.id, name, fields, memberUids });
      } else {
        await createPod({ name, fields, memberUids });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this pod.");
    } finally {
      setBusy(false);
    }
  }

  const looksLikeEmail = EMAIL_RE.test(search.trim());
  const emailAlreadyAMember = emailLookup.result ? memberUids.includes(emailLookup.result.uid) : false;

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 16 }}>
        {pod ? "Edit pod" : "New pod"}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Name</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Fields 4–6"
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16, fontSize: 13.5 }}
      />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Fields covered (optional)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {FIELDS.map((f) => (
          <Pill key={f} active={fields.includes(f)} onClick={() => toggleField(f)}>{f}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Members</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setEmailLookup({ status: "idle", result: null }); }}
          onKeyDown={(e) => e.key === "Enter" && looksLikeEmail && runEmailLookup()}
          placeholder="Search by name, or paste an email…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        {looksLikeEmail && (
          <button
            onClick={runEmailLookup}
            disabled={emailLookup.status === "loading"}
            style={{ padding: "0 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, fontWeight: 700, background: "none", cursor: "pointer" }}
          >
            {emailLookup.status === "loading" ? "Looking up…" : "Look up"}
          </button>
        )}
      </div>

      {nameResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {nameResults.map((c) => (
            <div
              key={c.uid}
              onClick={() => addMember(c.uid)}
              style={{ padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
            >
              {c.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {c.sublabel}</span>
            </div>
          ))}
        </div>
      )}

      {emailLookup.status === "done" && (
        <div style={{ marginBottom: 10 }}>
          {emailLookup.result ? (
            <div
              onClick={() => !emailAlreadyAMember && addMember(emailLookup.result!.uid)}
              style={{
                padding: "8px 10px",
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.color.border}`,
                cursor: emailAlreadyAMember ? "default" : "pointer",
                fontSize: 13.5,
                opacity: emailAlreadyAMember ? 0.6 : 1,
              }}
            >
              {emailLookup.result.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {emailLookup.result.sublabel}</span>
              {emailAlreadyAMember && <span style={{ color: theme.color.textMuted, fontSize: 12 }}> · already added</span>}
            </div>
          ) : (
            <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No account found for that email.</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {memberUids.map((uid) => (
          <Pill key={uid} onClick={() => removeMember(uid)}>
            {nameByUid.get(uid) ?? uid} ✕
          </Pill>
        ))}
        {memberUids.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No members yet.</div>}
      </div>

      {error && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          {error}
        </div>
      )}
      <PrimaryButton disabled={busy || !name.trim()} onClick={submit} style={{ width: "100%" }}>
        {busy ? "Saving…" : pod ? "SAVE CHANGES" : "CREATE POD"}
      </PrimaryButton>
    </Modal>
  );
}
