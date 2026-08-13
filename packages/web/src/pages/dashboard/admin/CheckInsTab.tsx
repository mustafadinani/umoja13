import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_ELIGIBILITY_TABLE, categoryLabelFor, PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS, SELF_REGISTERED_STATUS, INCOMPLETE_REGISTRATION_STATUS, checkInStatusLabel, type CheckIn, type CheckInStatus, type RegisteredPlayer } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllCheckIns, useAllUsers, useTeams } from "../../../hooks/useData";
import { useRegisteredPlayers } from "../../../hooks/useRegistration";
import { Card, FilterDropdown, Pill } from "../../../components/ui";
import { PlayerDocumentsModal } from "./PlayerDocumentsModal";
import { BulkEmailModal } from "./BulkEmailModal";

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ id: c.id, label: c.label }));

type View = "queue" | "fieldPrefs";

/**
 * Not every checked-in player has an app account (users doc) — most were
 * checked in by a captain/staff off the registration roster. This maps a
 * check-in's playerKey to the registration player's real name and their
 * signup photo, so both always have a real fallback: name before ever
 * showing a raw uid, and registration photo before an empty box.
 *
 * Keyed by playerKey (profileId, falling back to the row's own id) — NOT
 * the account uid, which every sibling on a shared family account has in
 * common. Keying by uid here previously meant whichever sibling's row
 * happened to load last silently overwrote every other sibling's entry,
 * so the review queue could show one kid's name/photo for another kid's
 * check-in.
 */
function useRegisteredPlayerByKey(registeredPlayers: RegisteredPlayer[]) {
  return useMemo(() => {
    const map = new Map<string, { name: string; photoUrl?: string; email?: string }>();
    for (const p of registeredPlayers) {
      const key = p.profileId?.trim() || p.id;
      if (!key) continue;
      const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
      if (name || p.profilePicture || p.email) map.set(key, { name, photoUrl: p.profilePicture, email: p.email });
    }
    return map;
  }, [registeredPlayers]);
}

export function CheckInsTab() {
  const [view, setView] = useState<View>("queue");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <Pill active={view === "queue"} onClick={() => setView("queue")}>Review Queue</Pill>
        <Pill active={view === "fieldPrefs"} onClick={() => setView("fieldPrefs")}>Field Preferences</Pill>
      </div>
      {view === "queue" ? <ReviewQueue /> : <FieldPreferencesTable />}
    </div>
  );
}

function ReviewQueue() {
  const { data: checkIns } = useAllCheckIns();
  const { data: users } = useAllUsers();
  const { data: teams } = useTeams(undefined);
  const { data: registeredPlayers } = useRegisteredPlayers();
  const registeredPlayerByKey = useRegisteredPlayerByKey(registeredPlayers);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("needs_review");
  const [openCheckInId, setOpenCheckInId] = useState<string | null>(null);
  const [showEligibility, setShowEligibility] = useState(false);

  // A team picked under one category doesn't exist once you switch to a
  // different one — clear it so the team filter never silently hides
  // every row after a category change.
  useEffect(() => setTeamId(null), [categoryId]);

  const teamOptions = useMemo(
    () =>
      teams
        .filter((t) => !categoryId || t.categoryId === categoryId)
        .map((t) => ({ id: t.id, label: t.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [teams, categoryId]
  );
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  // Registration name (keyed by playerKey, per-child) must win over the
  // account's own `users` doc displayName — that's one name shared by every
  // sibling on a family account, so checking it first would collapse every
  // kid's row back onto the same name, exactly the bug this function's own
  // playerKey-keying was built to avoid. Legacy check-ins written before
  // playerKey existed fall back to userId, matching their pre-fix
  // (ambiguous, best-effort) behavior exactly.
  const nameFor = (c: Pick<CheckIn, "userId" | "playerKey">) =>
    registeredPlayerByKey.get(c.playerKey ?? c.userId)?.name || userById.get(c.userId)?.displayName || c.userId;
  // Registration email (the address actually on file for this specific
  // child's signup) wins over the shared account's own email — same
  // precedence reasoning as nameFor, since one family account's email is
  // shared across every sibling on it.
  const emailFor = (c: Pick<CheckIn, "userId" | "playerKey">) =>
    registeredPlayerByKey.get(c.playerKey ?? c.userId)?.email?.trim() || userById.get(c.userId)?.email?.trim();
  const openCheckIn = checkIns.find((c) => c.id === openCheckInId) ?? null;
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  // Otherwise a stale "Copied N emails" from before a filter change keeps
  // showing next to a button that now says a completely different N —
  // easy to misread as "I just copied the current list."
  useEffect(() => setCopyStatus(null), [categoryId, teamId, statusFilter, search]);

  // Category/team/search filters only — status is excluded here so the
  // stats row below can show the status breakdown for whatever
  // category+team+search slice is selected, independent of which status
  // pill happens to be active.
  const scoped = checkIns.filter((c) => {
    if (categoryId && c.categoryId !== categoryId) return false;
    if (teamId && c.teamId !== teamId) return false;
    if (search && !nameFor(c).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const stats = {
    total: scoped.length,
    pending: scoped.filter((c) => c.status === "pending_review" || c.status === "admin_review").length,
    approved: scoped.filter((c) => c.status === "approved").length,
    rejected: scoped.filter((c) => c.status === "rejected").length,
  };

  // Registered players with no check-in doc at all — not "declined" or
  // "not started" (those have a doc and already surface under Declined /
  // the raw check-in count), but never even opened check-in. Same
  // category/team/search filters as everything else on this screen, keyed
  // the same way check-ins are (playerKey, falling back to id) so a player
  // counted here and one shown in the queue below never disagree.
  const checkedInKeys = useMemo(() => new Set(checkIns.map((c) => c.playerKey ?? c.userId)), [checkIns]);
  const notCheckedIn = useMemo(
    () =>
      registeredPlayers.filter((p) => {
        // Two kinds of rows aren't real, actionable registrations, and must
        // never surface here — same exclusion playersForTeam in
        // mapRegistration.ts already applies to real rosters: self-registered
        // rows (the removed in-app "Join a Team" flow, never vetted through
        // Outreach), and rows Outreach itself marks "Registration In
        // Progress" — a family that started signing up but abandoned it
        // before picking a team. The latter is the far more common case in
        // practice (348 of 1230 registration rows in production carry this
        // status) — without excluding it, a real kid who registered
        // correctly after an earlier abandoned attempt shows up twice: once
        // correctly, and once as a confusing "No team assigned" ghost row
        // for the same name.
        if (p.status === SELF_REGISTERED_STATUS || p.status === INCOMPLETE_REGISTRATION_STATUS) return false;
        const key = p.profileId?.trim() || p.id;
        if (!key || checkedInKeys.has(key)) return false;
        if (categoryId && p.categoryId !== categoryId) return false;
        if (teamId && p.teamId !== teamId) return false;
        if (search) {
          const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.toLowerCase();
          if (!name.includes(search.toLowerCase())) return false;
        }
        return true;
      }),
    [registeredPlayers, checkedInKeys, categoryId, teamId, search]
  );

  const filtered = statusFilter === "notCheckedIn"
    ? []
    : scoped.filter((c) => {
        if (statusFilter === "needs_review" && c.status !== "pending_review" && c.status !== "admin_review") return false;
        if (statusFilter === "approved" && c.status !== "approved") return false;
        if (statusFilter === "rejected" && c.status !== "rejected") return false;
        return true;
      });

  // Deduped, lowercase-normalized — matches whatever's currently on
  // screen (category/team/search/status filters all applied), so "copy
  // emails" always lines up with exactly the rows visible below. The
  // "Not checked in" cohort has no CheckIn doc to read an email off of, so
  // it reads straight from the registration record instead.
  const visibleEmails = statusFilter === "notCheckedIn"
    ? [...new Set(notCheckedIn.map((p) => p.email?.trim().toLowerCase()).filter((v): v is string => !!v))].sort()
    : [...new Set(filtered.map((c) => emailFor(c)?.toLowerCase()).filter((v): v is string => !!v))].sort();

  // Same dedup as visibleEmails, but keeps a name alongside each address so
  // BulkEmailModal's "individual" mode can greet each person by name — see
  // its own comment for why it needs the exact same filtered list this
  // button would otherwise just copy.
  const visibleRecipients = useMemo(() => {
    const seen = new Set<string>();
    const out: { email: string; name?: string }[] = [];
    const add = (email: string | undefined, name: string | undefined) => {
      const key = email?.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ email: key, name });
    };
    if (statusFilter === "notCheckedIn") {
      for (const p of notCheckedIn) add(p.email, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim());
    } else {
      for (const c of filtered) add(emailFor(c), nameFor(c));
    }
    return out;
  }, [statusFilter, notCheckedIn, filtered]);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);

  async function copyVisibleEmails() {
    try {
      await navigator.clipboard.writeText(visibleEmails.join("\n"));
      setCopyStatus(`Copied ${visibleEmails.length} email${visibleEmails.length === 1 ? "" : "s"}.`);
    } catch {
      setCopyStatus("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowEligibility((s) => !s)}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0,
          color: theme.color.navy, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: showEligibility ? 10 : 12,
        }}
      >
        {showEligibility ? "▾" : "▸"} Age eligibility requirements by category
      </button>
      {showEligibility && <EligibilityReferenceTable />}

      <input
        placeholder="Search by player name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <FilterDropdown label="Category" value={categoryId} options={CATEGORY_OPTIONS} onChange={setCategoryId} />
        <FilterDropdown label="Team" value={teamId} options={teamOptions} onChange={setTeamId} />
      </div>

      <div className="grid-kpi-5" style={{ marginBottom: 16 }}>
        <Kpi label="Check-ins" value={String(stats.total)} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <Kpi label="Pending review" value={String(stats.pending)} active={statusFilter === "needs_review"} onClick={() => setStatusFilter("needs_review")} />
        <Kpi label="Verified" value={String(stats.approved)} active={statusFilter === "approved"} onClick={() => setStatusFilter("approved")} />
        <Kpi label="Declined" value={String(stats.rejected)} active={statusFilter === "rejected"} onClick={() => setStatusFilter("rejected")} />
        <Kpi label="Not checked in" value={String(notCheckedIn.length)} active={statusFilter === "notCheckedIn"} onClick={() => setStatusFilter("notCheckedIn")} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          onClick={copyVisibleEmails}
          disabled={visibleEmails.length === 0}
          style={{
            background: theme.color.navy, color: "#fff", border: "none", borderRadius: theme.radius.sm,
            padding: "8px 14px", fontSize: 12.5, fontWeight: 700,
            cursor: visibleEmails.length === 0 ? "default" : "pointer",
            opacity: visibleEmails.length === 0 ? 0.6 : 1,
          }}
        >
          Copy {visibleEmails.length} email{visibleEmails.length === 1 ? "" : "s"} (deduped, matches filters above)
        </button>
        <button
          onClick={() => setBulkEmailOpen(true)}
          disabled={visibleRecipients.length === 0}
          style={{
            background: "none", color: theme.color.navy, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm,
            padding: "8px 14px", fontSize: 12.5, fontWeight: 700,
            cursor: visibleRecipients.length === 0 ? "default" : "pointer",
            opacity: visibleRecipients.length === 0 ? 0.6 : 1,
          }}
        >
          ✉ Email these {visibleRecipients.length}
        </button>
        {copyStatus && (
          <span style={{ fontSize: 13, fontWeight: 800, color: theme.color.success }}>✓ {copyStatus}</span>
        )}
      </div>

      {bulkEmailOpen && <BulkEmailModal recipients={visibleRecipients} onClose={() => setBulkEmailOpen(false)} />}

      {/*
        key={statusFilter} forces a full remount of this list on every tile
        switch, rather than letting React reconcile the old children against
        the new ones. Needed because "Not checked in" renders a completely
        different item type (RegisteredPlayer) than every other tile
        (CheckIn) under the same key scheme (profileId/id vs. check-in id) —
        if a check-in id ever happens to collide with a registration id/
        profileId string, React treats that as "the same element, just
        update props" instead of unmount+remount, which can leave the row
        showing the previous tile's content until something else (like a
        page refresh) forces a clean render.
      */}
      <div key={statusFilter} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {statusFilter === "notCheckedIn"
          ? notCheckedIn.map((p) => {
              const teamName = p.teamId?.trim() ? teamById.get(p.teamId)?.name ?? p.teamName ?? p.teamId : "No team assigned";
              return (
                <Card key={p.profileId?.trim() || p.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id}</div>
                    <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                      {teamName} · {p.categoryId ? categoryLabelFor(p.categoryId) : p.category ?? "—"}
                    </div>
                  </div>
                  <Pill bg="#F1EFF5" fg={theme.color.textMuted}>Not checked in</Pill>
                </Card>
              );
            })
          : filtered.map((c) => (
              <Card key={c.id} onClick={() => setOpenCheckInId(c.id)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{nameFor(c)}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {teamById.get(c.teamId)?.name ?? c.teamId} · {categoryLabelFor(c.categoryId)}
                  </div>
                </div>
                <StatusChip status={c.status} />
              </Card>
            ))}
        {statusFilter === "notCheckedIn"
          ? notCheckedIn.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Everyone in this view has checked in.</div>
          : filtered.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No check-ins match.</div>}
      </div>

      {openCheckIn && (
        <PlayerDocumentsModal
          checkIn={openCheckIn}
          user={userById.get(openCheckIn.userId)}
          fallbackName={registeredPlayerByKey.get(openCheckIn.playerKey ?? openCheckIn.userId)?.name}
          fallbackPhotoUrl={registeredPlayerByKey.get(openCheckIn.playerKey ?? openCheckIn.userId)?.photoUrl}
          fallbackEmail={emailFor(openCheckIn)}
          reviewerName={openCheckIn.reviewedBy ? userById.get(openCheckIn.reviewedBy)?.displayName : undefined}
          onClose={() => setOpenCheckInId(null)}
        />
      )}
    </div>
  );
}

/** Girls 14 & Under / Women's Open players' private-field scheduling preference, collected at check-in. */
function FieldPreferencesTable() {
  const { data: checkIns } = useAllCheckIns();
  const { data: users } = useAllUsers();
  const { data: teams } = useTeams();
  const { data: registeredPlayers } = useRegisteredPlayers();
  const registeredPlayerByKey = useRegisteredPlayerByKey(registeredPlayers);

  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  // Same precedence as ReviewQueue's nameFor — see its comment for why the
  // per-child registration name must win over the shared account displayName.
  const nameFor = (c: Pick<CheckIn, "userId" | "playerKey">) =>
    registeredPlayerByKey.get(c.playerKey ?? c.userId)?.name || userById.get(c.userId)?.displayName || c.userId;

  const responses = checkIns
    .filter((c) => PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS.includes(c.categoryId) && c.privateFieldPreference !== undefined)
    .sort((a, b) => b.submittedAt - a.submittedAt);

  return (
    <div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 12 }}>
        Asked only for Girls 14 & Under and Women's Open, at check-in.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {responses.map((c) => (
          <Card key={c.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{nameFor(c)}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                {teamById.get(c.teamId)?.name ?? c.teamId} · {categoryLabelFor(c.categoryId)}
              </div>
            </div>
            <Pill bg={c.privateFieldPreference ? theme.color.successBg : "#F1EFF5"} fg={c.privateFieldPreference ? theme.color.success : theme.color.textMuted}>
              {c.privateFieldPreference ? "Wants private field" : "No preference"}
            </Pill>
          </Card>
        ))}
        {responses.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No responses yet.</div>}
      </div>
    </div>
  );
}

/** Reference table for staff verifying a player's age against their ID during check-in review — same data CATEGORY_DOB_CUTOFF carries, laid out the way the official format guide presents it. */
function EligibilityReferenceTable() {
  return (
    <Card style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#F7F6F3", borderBottom: `1px solid ${theme.color.border}` }}>
            <th style={eligTh}>Tournament category</th>
            <th style={eligTh}>Format</th>
            <th style={eligTh}>Age restrictions</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORY_ELIGIBILITY_TABLE.map((row, i) => (
            <tr key={row.label} style={{ borderBottom: i < CATEGORY_ELIGIBILITY_TABLE.length - 1 ? "1px solid #F4F2F8" : undefined }}>
              <td style={{ ...eligTd, fontWeight: 700 }}>{row.label}</td>
              <td style={eligTd}>{row.format}</td>
              <td style={eligTd}>{row.ageRestriction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

const eligTh: React.CSSProperties = { textAlign: "left", padding: "9px 14px", fontSize: 11.5, fontWeight: 700, color: theme.color.textMuted };
const eligTd: React.CSSProperties = { textAlign: "left", padding: "10px 14px" };

function Kpi({ label, value, active, onClick }: { label: string; value: string; active?: boolean; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      style={{
        textAlign: "center",
        padding: 16,
        border: `1.5px solid ${active ? theme.color.navy : theme.color.border}`,
        background: active ? "#F1EFF5" : "#fff",
      }}
    >
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 26 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 2 }}>{label}</div>
    </Card>
  );
}

function StatusChip({ status }: { status: CheckInStatus }) {
  const map: Record<CheckInStatus, { bg: string; fg: string }> = {
    not_started: { bg: "#F1EFF5", fg: theme.color.textMuted },
    pending_review: { bg: theme.color.warningBg, fg: theme.color.warning },
    admin_review: { bg: theme.color.warningBg, fg: theme.color.warning },
    approved: { bg: theme.color.successBg, fg: theme.color.success },
    rejected: { bg: theme.color.dangerBg, fg: theme.color.danger },
  };
  const s = map[status];
  return <Pill bg={s.bg} fg={s.fg}>{checkInStatusLabel(status)}</Pill>;
}
