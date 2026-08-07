import { useState } from "react";
import { FIELDS, type Pod } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { usePodMemberSearch } from "../../../hooks/usePodMemberSearch";
import { createPod, updatePod } from "../../../lib/callables";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";

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
  const [name, setName] = useState(pod?.name ?? "");
  const [fields, setFields] = useState<string[]>(pod?.fields ?? []);
  const [memberUids, setMemberUids] = useState<string[]>(pod?.memberUids ?? []);
  const [visibility, setVisibility] = useState<"open" | "closed">(pod?.visibility === "closed" ? "closed" : "open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { search, setSearch, nameResults, emailLookup, runEmailLookup, looksLikeEmail, nameByUid, resetSearch } =
    usePodMemberSearch(memberUids);

  function toggleField(f: string) {
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function addMember(uid: string) {
    setMemberUids((prev) => [...prev, uid]);
    resetSearch();
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
        await updatePod({ podId: pod.id, name, fields, memberUids, visibility });
      } else {
        await createPod({ name, fields, memberUids, visibility });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this pod.");
    } finally {
      setBusy(false);
    }
  }

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

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Who can join</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {(
          [
            { value: "open" as const, title: "🌐 Open pod", desc: "Any volunteer or referee can self-join from \"Open Pods\" on their Hub — no invite needed." },
            { value: "closed" as const, title: "🔒 Closed pod", desc: "Invite-only — only staff can add members via \"+ Add People.\" Won't appear in anyone's self-join list." },
          ]
        ).map((opt) => (
          <div
            key={opt.value}
            onClick={() => setVisibility(opt.value)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: theme.radius.sm,
              border: `1.5px solid ${visibility === opt.value ? theme.color.purple : theme.color.border}`,
              background: visibility === opt.value ? "#F6EEFC" : "none", cursor: "pointer",
            }}
          >
            <input type="radio" checked={visibility === opt.value} onChange={() => setVisibility(opt.value)} style={{ marginTop: 3 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.title}</div>
              <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 2 }}>{opt.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Members</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
