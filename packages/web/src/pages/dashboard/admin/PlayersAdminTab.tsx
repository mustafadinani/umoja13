import { useEffect, useMemo, useState } from "react";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import {
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  COLLECTIONS,
  SELF_REGISTERED_STATUS,
  INCOMPLETE_REGISTRATION_STATUS,
  TODDLERS_CAMP_CATEGORY_LABELS,
  checkInStatusLabel,
  checkInStatusTone,
  type Category,
  type RegisteredPlayer,
  type RosterCheckIn,
  type UserProfile,
} from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllCheckIns, useAllUsers, useCategories } from "../../../hooks/useData";
import { useCollection } from "../../../hooks/firestore";
import { useRegisteredPlayers, useRegisteredTeamsRaw } from "../../../hooks/useRegistration";
import { Card, Pill } from "../../../components/ui";
import { db, defaultDb } from "../../../lib/firebase";
import { PlayerDocumentsModal } from "./PlayerDocumentsModal";
import { PlayerProfileModal } from "./PlayerProfileModal";

/** Same identifier every check-in/roster/jersey lookup elsewhere in the app uses to pick out one specific child on a shared family account — never the bare account uid. */
function playerKeyOf(player: RegisteredPlayer): string {
  return player.profileId?.trim() || player.id;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve a registration player's category against umoja13-app / categories.
 * `nonCompetitive` covers real registration categoryIds (Toddlers Camp) that
 * are legitimate but intentionally outside the tournament's CATEGORIES list
 * — no games/standings/team structure, so they're not an "invalid category"
 * error and shouldn't show a bare UUID either.
 */
function matchPlayerCategory(
  player: RegisteredPlayer,
  categories: Category[]
): { categoryId: string; matched: Category | null; rawDisplay: string; nonCompetitive: boolean } {
  const byId = player.categoryId?.trim() ?? "";
  if (byId) {
    const matched = categories.find((c) => c.id === byId) ?? null;
    const nonCompetitiveLabel = TODDLERS_CAMP_CATEGORY_LABELS[byId];
    return {
      categoryId: byId,
      matched,
      rawDisplay: matched?.label ?? nonCompetitiveLabel ?? byId,
      nonCompetitive: !matched && !!nonCompetitiveLabel,
    };
  }

  const label = player.category?.trim() ?? "";
  if (!label) {
    return { categoryId: "", matched: null, rawDisplay: "", nonCompetitive: false };
  }

  const byLabel =
    categories.find((c) => normalizeLabel(c.label) === normalizeLabel(label)) ??
    categories.find((c) => {
      const a = normalizeLabel(c.label).replace(/[^a-z0-9]/g, "");
      const b = normalizeLabel(label).replace(/[^a-z0-9]/g, "");
      return a === b;
    }) ??
    null;
  if (byLabel) {
    return { categoryId: byLabel.id, matched: byLabel, rawDisplay: label, nonCompetitive: false };
  }

  // Older rows sometimes stored a UUID in `category` instead of a label.
  const asId = categories.find((c) => c.id === label) ?? null;
  if (asId) {
    return { categoryId: asId.id, matched: asId, rawDisplay: asId.label, nonCompetitive: false };
  }
  const nonCompetitiveLabel = TODDLERS_CAMP_CATEGORY_LABELS[label];
  if (nonCompetitiveLabel) {
    return { categoryId: label, matched: null, rawDisplay: nonCompetitiveLabel, nonCompetitive: true };
  }

  return { categoryId: label, matched: null, rawDisplay: label, nonCompetitive: false };
}

/**
 * Admin list of all registration players from `(default)` /
 * uGames/2026/playersRegistered, with resolved team names and check-in status
 * from umoja13-app / checkIns.
 */
export function PlayersAdminTab() {
  const { data: players, loading: playersLoading, error: playersError } = useRegisteredPlayers();
  const { data: teams, loading: teamsLoading, error: teamsError } = useRegisteredTeamsRaw();
  const { data: checkIns, loading: checkInsLoading } = useAllCheckIns();
  const { data: categories, loading: categoriesLoading } = useCategories();
  const { data: users } = useAllUsers();
  // Whole-collection fetch for jersey numbers — the same PII-free overlay
  // Teams tab already reads jerseyNumber off, kept as a separate fetch from
  // checkIns because jerseyNumber is never mirrored onto CheckIn itself.
  const { data: rosterCheckIns } = useCollection<RosterCheckIn>(COLLECTIONS.rosterCheckIns);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  // Defaults to "with a team" — that's the group admins actually work
  // through day to day; "all" buries them under everyone still mid-signup.
  const [teamFilter, setTeamFilter] = useState<"all" | "withTeam" | "noTeam" | "invalidCategory" | "selfRegistered" | "incompleteRegistration">("withTeam");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  // Otherwise a stale "Copied N emails" from before a filter change keeps
  // showing next to a button that now says a completely different N.
  useEffect(() => setCopyStatus(null), [teamFilter, categoryFilter, search]);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) {
      map.set(t.id, t.teamName?.trim() || "Untitled team");
    }
    return map;
  }, [teams]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  // Keyed by playerKey (CheckIn.playerKey, falling back to userId for
  // check-ins written before that field existed) — NOT the bare account
  // uid, which every sibling on a shared family account has in common.
  // The tab used to match check-ins by uid alone, so two siblings sharing
  // one account could show each other's check-in status; this is the same
  // keying CheckInsTab/RosterPanel/Teams tab already use.
  const checkInByPlayerKey = useMemo(() => new Map(checkIns.map((c) => [c.playerKey ?? c.userId, c])), [checkIns]);
  const jerseyByPlayerKey = useMemo(() => new Map(rosterCheckIns.map((r) => [r.userId, r.jerseyNumber])), [rosterCheckIns]);

  const filterLabels = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) {
      const { matched, rawDisplay } = matchPlayerCategory(p, categories);
      if (matched) set.add(matched.label);
      else if (rawDisplay) set.add(rawDisplay);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [players, categories]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .map((p) => {
        const teamId = p.teamId?.trim() || "";
        const hasTeam = teamId.length > 0;
        const teamName = hasTeam
          ? teamNameById.get(teamId) || p.teamName?.trim() || `Team ${teamId}`
          : undefined;
        const playerKey = playerKeyOf(p);
        const checkIn = checkInByPlayerKey.get(playerKey);
        const jerseyNumber = jerseyByPlayerKey.get(playerKey);
        const categoryMatch = matchPlayerCategory(p, categories);
        return { player: p, playerKey, teamId, teamName, hasTeam, checkIn, jerseyNumber, categoryMatch };
      })
      .filter(({ player, hasTeam, categoryMatch }) => {
        // Self-registered and incomplete-registration are each their own
        // dedicated view, independent of team/category status — self-
        // registered rows came in through the removed "Join a Team" flow
        // rather than the real Outreach import, and incomplete rows are
        // Outreach's own "Registration In Progress" status (a family that
        // started signing up but never finished) — so both need to be
        // findable regardless of whether they happen to have a team.
        if (teamFilter === "selfRegistered" && player.status !== SELF_REGISTERED_STATUS) return false;
        if (teamFilter === "incompleteRegistration" && player.status !== INCOMPLETE_REGISTRATION_STATUS) return false;
        // Every other view (All/With a team/No team/Invalid category) only
        // makes sense over real, completed registrations — an abandoned
        // Outreach signup or a self-registered dupe isn't a real player
        // "missing a team," they just never became a real registration at
        // all, so they'd otherwise double-count under "No team assigned."
        if (
          teamFilter !== "selfRegistered" &&
          teamFilter !== "incompleteRegistration" &&
          (player.status === SELF_REGISTERED_STATUS || player.status === INCOMPLETE_REGISTRATION_STATUS)
        ) {
          return false;
        }
        // "No team assigned" and "with a team" are complements of the exact
        // same predicate used below to compute unassignedCount — so the KPI
        // tiles' numbers and what clicking them filters to always agree.
        const unassigned = !hasTeam && !categoryMatch.nonCompetitive;
        if (teamFilter === "noTeam" && !unassigned) return false;
        if (teamFilter === "withTeam" && unassigned) return false;
        if (teamFilter === "invalidCategory" && (categoryMatch.matched || categoryMatch.nonCompetitive)) return false;
        if (categoryFilter) {
          const label = categoryMatch.matched?.label ?? categoryMatch.rawDisplay;
          if (label !== categoryFilter) return false;
        }
        if (!q) return true;
        const name = `${player.firstName ?? ""} ${player.lastName ?? ""}`.toLowerCase();
        const email = (player.email ?? "").toLowerCase();
        const team = (player.teamName ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || team.includes(q);
      })
      .sort((a, b) => {
        const an = `${a.player.lastName ?? ""} ${a.player.firstName ?? ""}`.toLowerCase();
        const bn = `${b.player.lastName ?? ""} ${b.player.firstName ?? ""}`.toLowerCase();
        return an.localeCompare(bn);
      });
  }, [players, teamNameById, checkInByPlayerKey, jerseyByPlayerKey, search, categoryFilter, teamFilter, categories]);

  // Self-registered and incomplete-registration rows aren't real
  // registrations at all (see the identical exclusion in the `rows` filter
  // above) — excluded here too so "Registered players" and every KPI
  // derived from it always match exactly what clicking into that tile shows.
  const realPlayers = useMemo(
    () => players.filter((p) => p.status !== SELF_REGISTERED_STATUS && p.status !== INCOMPLETE_REGISTRATION_STATUS),
    [players]
  );
  const unassignedCount = realPlayers.filter((p) => !p.teamId?.trim() && !matchPlayerCategory(p, categories).nonCompetitive).length;
  const invalidCategoryCount = realPlayers.filter((p) => {
    const m = matchPlayerCategory(p, categories);
    return !m.matched && !m.nonCompetitive;
  }).length;
  const selfRegisteredCount = players.filter((p) => p.status === SELF_REGISTERED_STATUS).length;
  const incompleteRegistrationCount = players.filter((p) => p.status === INCOMPLETE_REGISTRATION_STATUS).length;
  // Deduped, lowercase-normalized emails for whatever's currently on
  // screen — respects every active filter (team/category/search) so
  // "copy emails" always matches exactly the rows visible, e.g. everyone
  // with no team assigned, or everyone in one category with a team.
  const visibleEmails = useMemo(() => {
    const seen = new Set<string>();
    for (const { player } of rows) {
      const email = player.email?.trim().toLowerCase();
      if (email) seen.add(email);
    }
    return [...seen].sort();
  }, [rows]);

  async function copyVisibleEmails() {
    try {
      await navigator.clipboard.writeText(visibleEmails.join("\n"));
      setCopyStatus(`Copied ${visibleEmails.length} email${visibleEmails.length === 1 ? "" : "s"}.`);
    } catch {
      setCopyStatus("Couldn't copy — your browser blocked clipboard access.");
    }
  }
  const loading = playersLoading || teamsLoading || checkInsLoading || categoriesLoading;
  const error = playersError || teamsError;
  const openRow = openPlayerId ? rows.find((r) => r.player.id === openPlayerId) ?? null : null;

  async function assignCategory(player: RegisteredPlayer, nextCategoryId: string) {
    const selected = categoryById.get(nextCategoryId);
    if (!selected) return;
    setSavingId(player.id);
    setSaveError(null);
    try {
      const regRef = doc(defaultDb, REGISTRATION_ROOT, REGISTRATION_YEAR, PLAYERS_REGISTERED, player.id);
      await updateDoc(regRef, {
        categoryId: selected.id,
        category: selected.label,
      });

      // Keep seed/test profiles in sync when this uid already has a users doc.
      const uid = player.uid?.trim();
      if (uid) {
        try {
          const userRef = doc(db, COLLECTIONS.users, uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            const memberships = profile.playerOf ?? [];
            const nextMemberships = memberships.map((m) =>
              m.teamId === player.teamId ? { ...m, categoryId: selected.id } : m
            );
            if (JSON.stringify(memberships) !== JSON.stringify(nextMemberships)) {
              await updateDoc(userRef, { playerOf: nextMemberships, updatedAt: Date.now() });
            }
          }
        } catch {
          // Registration write succeeded; profile sync is best-effort.
        }
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't update category.");
    } finally {
      setSavingId(null);
    }
  }

  /**
   * Deletes a self-registered "Join a Team" entry — these were created by
   * the now-removed in-app self-serve flow, never vetted through the real
   * Outreach registration/import pipeline, so they're not real registered
   * players. Also strips the matching membership off the submitter's own
   * account (matched by profileId, which the self-serve flow always set to
   * this exact playersRegistered doc's id) so the account doesn't keep
   * showing a roster spot for a registration that no longer exists.
   */
  async function rejectSelfRegisteredPlayer(player: RegisteredPlayer) {
    const name = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "this player";
    if (!window.confirm(`Remove ${name}'s self-registration? This permanently deletes the registration record and can't be undone.`)) {
      return;
    }
    setSavingId(player.id);
    setSaveError(null);
    try {
      await deleteDoc(doc(defaultDb, REGISTRATION_ROOT, REGISTRATION_YEAR, PLAYERS_REGISTERED, player.id));

      const uid = player.uid?.trim();
      if (uid) {
        try {
          const userRef = doc(db, COLLECTIONS.users, uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            const memberships = profile.playerOf ?? [];
            const nextMemberships = memberships.filter((m) => m.profileId !== player.id);
            if (nextMemberships.length !== memberships.length) {
              await updateDoc(userRef, { playerOf: nextMemberships, updatedAt: Date.now() });
            }
          }
        } catch {
          // Registration doc is already gone; profile cleanup is best-effort.
        }
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't remove this registration.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="grid-kpi-6" style={{ marginBottom: 20 }}>
        <Kpi
          label="Registered players"
          value={loading ? "…" : String(realPlayers.length)}
          active={teamFilter === "all"}
          onClick={() => setTeamFilter("all")}
        />
        <Kpi
          label="With a team"
          value={loading ? "…" : String(realPlayers.length - unassignedCount)}
          active={teamFilter === "withTeam"}
          onClick={() => setTeamFilter("withTeam")}
        />
        <Kpi
          label="No team assigned"
          value={loading ? "…" : String(unassignedCount)}
          accent={unassignedCount > 0}
          active={teamFilter === "noTeam"}
          onClick={() => setTeamFilter("noTeam")}
        />
        <Kpi
          label="Invalid category"
          value={loading ? "…" : String(invalidCategoryCount)}
          accent={invalidCategoryCount > 0}
          active={teamFilter === "invalidCategory"}
          onClick={() => setTeamFilter("invalidCategory")}
        />
        <Kpi
          label="Self-registered (not real)"
          value={loading ? "…" : String(selfRegisteredCount)}
          accent={selfRegisteredCount > 0}
          active={teamFilter === "selfRegistered"}
          onClick={() => setTeamFilter("selfRegistered")}
        />
        <Kpi
          label="Registration in progress"
          value={loading ? "…" : String(incompleteRegistrationCount)}
          accent={incompleteRegistrationCount > 0}
          active={teamFilter === "incompleteRegistration"}
          onClick={() => setTeamFilter("incompleteRegistration")}
        />
      </div>

      <input
        placeholder="Search by name, email, or team…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: theme.radius.sm,
          border: `1px solid ${theme.color.border}`,
          fontSize: 13.5,
          marginBottom: 12,
        }}
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!categoryFilter} onClick={() => setCategoryFilter(null)}>All categories</Pill>
        {filterLabels.map((c) => (
          <Pill key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>{c}</Pill>
        ))}
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
        {copyStatus && (
          <span style={{ fontSize: 13, fontWeight: 800, color: theme.color.success }}>✓ {copyStatus}</span>
        )}
      </div>
      {error && (
        <div style={{ color: theme.color.danger, fontSize: 13.5, marginBottom: 12 }}>
          Couldn't load registration players: {error}
        </div>
      )}
      {saveError && (
        <div style={{ color: theme.color.danger, fontSize: 13.5, marginBottom: 12 }}>{saveError}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ player, teamName, hasTeam, checkIn, jerseyNumber, categoryMatch }) => {
          const displayName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
          const invalid = !categoryMatch.matched && !categoryMatch.nonCompetitive;
          const selfRegistered = player.status === SELF_REGISTERED_STATUS;
          const incompleteRegistration = player.status === INCOMPLETE_REGISTRATION_STATUS;
          return (
            <Card
              key={player.id}
              onClick={() => setOpenPlayerId(player.id)}
              style={{
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                cursor: "pointer",
                borderColor: invalid || selfRegistered ? theme.color.danger : incompleteRegistration ? theme.color.warning : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
                {player.profilePicture ? (
                  <img
                    src={player.profilePicture}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: theme.color.purple,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {[
                      categoryMatch.matched?.label ?? (categoryMatch.rawDisplay || "No category"),
                      player.email,
                      player.status,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>

                  {selfRegistered && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: theme.radius.sm,
                        background: theme.color.dangerBg,
                        color: theme.color.danger,
                        fontSize: 12.5,
                        lineHeight: 1.45,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Self-registered — not a real registration</div>
                      <div>
                        Created through the in-app "Join a Team" flow (now removed), not the real Outreach
                        registration/import. Never reviewed by an admin.
                      </div>
                      <button
                        disabled={savingId === player.id}
                        onClick={() => void rejectSelfRegisteredPlayer(player)}
                        style={{
                          marginTop: 10,
                          padding: "8px 12px",
                          borderRadius: theme.radius.sm,
                          border: `1px solid ${theme.color.danger}`,
                          background: "#fff",
                          color: theme.color.danger,
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: savingId === player.id ? "default" : "pointer",
                          opacity: savingId === player.id ? 0.6 : 1,
                        }}
                      >
                        {savingId === player.id ? "Removing…" : "Remove — not a real registration"}
                      </button>
                    </div>
                  )}

                  {incompleteRegistration && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: theme.radius.sm,
                        background: theme.color.warningBg,
                        color: theme.color.warning,
                        fontSize: 12.5,
                        lineHeight: 1.45,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>⏳ Registration in progress — not finished</div>
                      <div>
                        This family started registering on our registration site but never finished (no team, no
                        category on file). Not something to check in or place on a team — no action needed here
                        unless you want to follow up with them directly at {player.email || "the email on file"}.
                      </div>
                    </div>
                  )}

                  {invalid && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: theme.radius.sm,
                        background: theme.color.dangerBg,
                        color: theme.color.danger,
                        fontSize: 12.5,
                        lineHeight: 1.45,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Category not found</div>
                      <div>
                        {!categoryMatch.categoryId
                          ? "This player has no categoryId assigned."
                          : <>Category id <code style={{ fontSize: 11 }}>{categoryMatch.categoryId}</code> is missing or not in the tournament categories list (e.g. Boy&apos;s 8 &amp; Under).</>}
                      </div>
                      <label style={{ display: "block", marginTop: 10, fontWeight: 600, color: theme.color.text }}>
                        Assign a valid category
                        <select
                          value=""
                          disabled={savingId === player.id || categories.length === 0}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next) void assignCategory(player, next);
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: 6,
                            padding: "8px 10px",
                            borderRadius: theme.radius.sm,
                            border: `1px solid ${theme.color.border}`,
                            fontSize: 13,
                            background: "#fff",
                            color: theme.color.text,
                          }}
                        >
                          <option value="">{savingId === player.id ? "Saving…" : "Select category…"}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {hasTeam ? (
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{teamName}</div>
                ) : categoryMatch.nonCompetitive ? (
                  <div style={{ fontWeight: 700, fontSize: 13, color: theme.color.textMuted }}>Camp — no team needed</div>
                ) : (
                  <div style={{ fontWeight: 800, fontSize: 13, color: theme.color.danger }}>No team assigned.</div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
                  {jerseyNumber !== undefined && (
                    <span style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 13, color: theme.color.purple }}>
                      #{jerseyNumber}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: {
                        success: theme.color.success,
                        warning: theme.color.warning,
                        muted: theme.color.textMuted,
                        danger: theme.color.danger,
                      }[checkInStatusTone(checkIn?.status)],
                    }}
                  >
                    {checkIn ? checkInStatusLabel(checkIn.status) : "Not checked in"}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
        {!loading && rows.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No players match.</div>
        )}
        {loading && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Loading players…</div>}
      </div>

      {/*
        A player with a submitted check-in opens the exact same modal the
        Check-ins tab uses — same data, same status, same decide/note tools
        — so there's only ever one place this tab and that one can disagree.
        A player who's never checked in yet (no CheckIn doc to show) gets
        the lighter profile-only modal instead.
      */}
      {openRow?.checkIn && (
        <PlayerDocumentsModal
          checkIn={openRow.checkIn}
          user={userById.get(openRow.checkIn.userId)}
          fallbackName={`${openRow.player.firstName ?? ""} ${openRow.player.lastName ?? ""}`.trim() || undefined}
          fallbackPhotoUrl={openRow.player.profilePicture}
          fallbackEmail={openRow.player.email}
          reviewerName={openRow.checkIn.reviewedBy ? userById.get(openRow.checkIn.reviewedBy)?.displayName : undefined}
          onClose={() => setOpenPlayerId(null)}
        />
      )}
      {openRow && !openRow.checkIn && (
        <PlayerProfileModal
          player={openRow.player}
          teamName={openRow.teamName}
          categoryLabel={openRow.categoryMatch.matched?.label ?? openRow.categoryMatch.rawDisplay}
          jerseyNumber={openRow.jerseyNumber}
          onClose={() => setOpenPlayerId(null)}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: string;
  accent?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      style={{
        padding: "14px 16px",
        border: `1.5px solid ${active ? theme.color.navy : theme.color.border}`,
        background: active ? "#F1EFF5" : "#fff",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: theme.color.textMuted }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28, marginTop: 4, color: accent ? theme.color.danger : theme.color.text }}>
        {value}
      </div>
    </Card>
  );
}
