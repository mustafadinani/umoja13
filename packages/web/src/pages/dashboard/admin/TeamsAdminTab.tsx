import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import {
  COLLECTIONS,
  MAX_TEAM_OFFICIALS,
  OFFICIAL_KIND_LABELS,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  TODDLERS_CAMP_CATEGORY_LABELS,
  resolvePlayerCategoryId,
  resolveTeamCategoryId,
  type OfficialKind,
  type RegisteredPlayer,
  type RegisteredTeam,
  type RosterCheckIn,
} from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllUsers, useCategories, useTeam } from "../../../hooks/useData";
import { useCollection } from "../../../hooks/firestore";
import {
  useRegisteredPlayers,
  useRegisteredTeamsRaw,
  useRegistrationCategoryBuckets,
} from "../../../hooks/useRegistration";
import { assignTeamOfficial, removeTeamOfficial, setJerseyNumber } from "../../../lib/callables";
import { db, defaultDb } from "../../../lib/firebase";
import { Card, FilterDropdown, Pill, PrimaryButton } from "../../../components/ui";

function teamLogoUrl(team: RegisteredTeam): string | undefined {
  return team.logoUrl || team.teamLogo || team.logo || undefined;
}

function TeamAvatar({ team, size = 48 }: { team: RegisteredTeam; size?: number }) {
  const logo = teamLogoUrl(team);
  const initials = (team.teamName ?? "?").trim().slice(0, 2).toUpperCase() || "?";
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        style={{ width: size, height: size, borderRadius: 12, objectFit: "cover", flexShrink: 0, background: "#fff" }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: theme.color.purple,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.32,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/**
 * Admin list of registration teams from `(default)` / teamsRegistered.
 * Category pills match Standings (same buckets + counts).
 */
export function TeamsAdminTab() {
  const { data: teams, loading: teamsLoading, error: teamsError } = useRegisteredTeamsRaw();
  const { data: players, loading: playersLoading, error: playersError } = useRegisteredPlayers();
  const { data: tournamentCategories } = useCategories();
  const { buckets } = useRegistrationCategoryBuckets();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  // Toddlers Camp categories only ever hold one auto-generated "shell" team
  // (a placeholder name, since camp signup never asks for a real team name)
  // wrapping however many campers actually registered. Drilling into that
  // shell team's own detail view — with its irrelevant Standings
  // placement/group editor — just to see the roster is a dead end for staff.
  // This bypasses the team entirely: picking one of these two category pills
  // jumps straight to a flat camper list built directly off registration
  // players, independent of whatever team they happen to be linked to.
  const [campCategoryId, setCampCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Same buildTeamFromRegistration output Team.tsx and RosterPanel already
  // read jerseyNumber off of — reusing it here instead of re-deriving keeps
  // this admin view's numbers exactly in sync with what a captain/manager
  // or the public team page shows, with no separate query to drift.
  const { data: selectedTeamWithRoster } = useTeam(selectedTeamId ?? undefined);
  const jerseyByPlayerKey = useMemo(
    () => new Map((selectedTeamWithRoster?.roster ?? []).map((r) => [r.playerKey ?? r.userId, r.jerseyNumber])),
    [selectedTeamWithRoster]
  );

  // Whole-collection fetch (not scoped to one team, unlike selectedTeamWithRoster
  // above) — the summary KPIs below need check-in/jersey counts across
  // whatever set of teams the filters currently show, not just one selected
  // team. Counted directly off these docs (see filteredKpis below), not by
  // matching them back to playersRegistered rows.
  const { data: allRosterCheckIns } = useCollection<RosterCheckIn>(COLLECTIONS.rosterCheckIns);

  const playersByTeamId = useMemo(() => {
    const map = new Map<string, RegisteredPlayer[]>();
    for (const p of players) {
      const tid = p.teamId?.trim();
      if (!tid) continue;
      const list = map.get(tid) ?? [];
      list.push(p);
      map.set(tid, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        `${a.lastName ?? ""} ${a.firstName ?? ""}`.localeCompare(`${b.lastName ?? ""} ${b.firstName ?? ""}`)
      );
    }
    return map;
  }, [players]);

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of tournamentCategories) map.set(c.id, c.label);
    for (const b of buckets) {
      if (!map.has(b.id)) map.set(b.id, b.label);
    }
    return map;
  }, [tournamentCategories, buckets]);

  // Current playerKeys per team — jersey counting below needs this (unlike
  // check-in counting, see filteredKpis' comment) because rosterCheckIns is
  // append-only: a registration correction/resubmission leaves the OLD
  // playerKey's overlay doc behind forever, jerseyNumber and all. Counting
  // those raw makes a team's "jerseys assigned" exceed its actual player
  // count (confirmed ~10 real teams in production show exactly this — one
  // as bad as 16 "assigned" against 12 real current players), which can
  // never happen once it's scoped to players who are still actually on the
  // roster.
  const currentPlayerKeysByTeam = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [teamId, list] of playersByTeamId) {
      map.set(teamId, new Set(list.map((p) => p.profileId?.trim() || p.id)));
    }
    return map;
  }, [playersByTeamId]);

  // Jersey-assigned count per team — scoped to current roster spots only
  // (see currentPlayerKeysByTeam above), so it can never read higher than
  // the team's own player count.
  const jerseyCountByTeamId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allRosterCheckIns) {
      if (r.jerseyNumber === undefined) continue;
      if (!currentPlayerKeysByTeam.get(r.teamId)?.has(r.userId)) continue;
      map.set(r.teamId, (map.get(r.teamId) ?? 0) + 1);
    }
    return map;
  }, [allRosterCheckIns, currentPlayerKeysByTeam]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams
      .map((team) => ({
        team,
        resolvedCategoryId: resolveTeamCategoryId(team, tournamentCategories),
        playerCount: playersByTeamId.get(team.id)?.length ?? 0,
        jerseyCount: jerseyCountByTeamId.get(team.id) ?? 0,
      }))
      .filter(({ team, resolvedCategoryId }) => {
        if (teamFilter && team.id !== teamFilter) return false;
        if (categoryFilter && resolvedCategoryId !== categoryFilter) return false;
        if (!q) return true;
        return (
          (team.teamName ?? "").toLowerCase().includes(q) ||
          (team.teamCaptainName ?? "").toLowerCase().includes(q) ||
          (team.email ?? "").toLowerCase().includes(q) ||
          (team.category ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.team.teamName ?? "").localeCompare(b.team.teamName ?? ""));
  }, [teams, playersByTeamId, jerseyCountByTeamId, search, categoryFilter, teamFilter, tournamentCategories]);

  // Registered/checked-in/jerseyed counts for whichever teams the filters
  // above currently show.
  //
  // Checked-in deliberately counts straight off rosterCheckIns docs (scoped
  // by teamId), matching exactly how CheckInsTab's own "Verified" KPI
  // counts (straight off the checkIns collection) — NOT by looping over
  // current playersRegistered rows and looking up each one's check-in by
  // playerKey. That loop-and-lookup approach silently drops every check-in
  // whose playerKey no longer matches any CURRENT registration row (a
  // registration correction/resubmission leaves the old check-in's
  // playerKey orphaned — confirmed ~20 real approved check-ins in
  // production are in exactly this state), undercounting "Checked-in"
  // below the Check-ins tab's real number even though those check-ins are
  // genuinely approved. Counting the check-in docs directly can't drop
  // them, so the two tabs' numbers actually reconcile.
  //
  // Jerseyed is the opposite case: it's scoped to CURRENT playerKeys (see
  // currentPlayerKeysByTeam above), because an orphaned rosterCheckIns doc
  // still holding a jerseyNumber represents a number nobody on the current
  // roster can actually be wearing — counting it raw let this total (and
  // each team's own badge) exceed the team's real player count.
  const filteredKpis = useMemo(() => {
    const teamIds = new Set(rows.map((r) => r.team.id));
    const registered = players.filter((p) => {
      const tid = p.teamId?.trim();
      return tid && teamIds.has(tid);
    }).length;
    const relevantRosterCheckIns = allRosterCheckIns.filter((r) => teamIds.has(r.teamId));
    const checkedIn = relevantRosterCheckIns.filter((r) => r.status === "approved").length;
    const jerseyed = relevantRosterCheckIns.filter(
      (r) => r.jerseyNumber !== undefined && currentPlayerKeysByTeam.get(r.teamId)?.has(r.userId)
    ).length;
    return { registered, checkedIn, jerseyed };
  }, [rows, players, allRosterCheckIns, currentPlayerKeysByTeam]);

  const teamOptions = useMemo(
    () =>
      teams
        .map((t) => ({ id: t.id, label: t.teamName || "Untitled team" }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [teams]
  );

  const selectedTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) ?? null : null;
  const selectedPlayers = selectedTeamId ? playersByTeamId.get(selectedTeamId) ?? [] : [];
  const loading = teamsLoading || playersLoading;
  const error = teamsError || playersError;

  async function saveTeamFields(patch: { categoryId?: string; category?: string; group?: string | null }) {
    if (!selectedTeam) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ref = doc(defaultDb, REGISTRATION_ROOT, REGISTRATION_YEAR, TEAMS_REGISTERED, selectedTeam.id);
      await updateDoc(ref, patch);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save team.");
    } finally {
      setSaving(false);
    }
  }

  if (campCategoryId) {
    const label = TODDLERS_CAMP_CATEGORY_LABELS[campCategoryId] ?? "Camp";
    const campers = players
      .filter((p) => p.categoryId?.trim() === campCategoryId)
      .sort((a, b) =>
        `${a.lastName ?? ""} ${a.firstName ?? ""}`.localeCompare(`${b.lastName ?? ""} ${b.firstName ?? ""}`)
      );
    // Every camper in this category is still linked to registration's one
    // auto-generated shell team (see the comment on campCategoryId above) —
    // Coach/Manager assignment lives on that team's umoja13-app overlay doc
    // (Team.coachManagerUids) the same way it does for a real team, this
    // view just never surfaced it since it otherwise bypasses the team
    // entirely. Assumes (confirmed against real registration data) every
    // camper in one camp category shares the same single shell team.
    const campTeamId = campers.find((p) => p.teamId?.trim())?.teamId?.trim() ?? null;

    return (
      <div>
        <PrimaryButton onClick={() => setCampCategoryId(null)} style={{ marginBottom: 16 }}>
          ← All teams
        </PrimaryButton>

        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28 }}>{label}</div>
        <div style={{ fontSize: 13.5, color: theme.color.textMuted, marginTop: 4, marginBottom: 8 }}>
          Non-competitive — no team, games, or standings. Every registered camper shows up here directly.
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
          {campers.length} camper{campers.length === 1 ? "" : "s"} registered
        </div>

        {campTeamId && <TeamOfficialsCard teamId={campTeamId} categoryId={campCategoryId} players={campers} />}

        {loading ? (
          <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Loading players…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {campers.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
            {campers.length === 0 && (
              <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No campers registered yet.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (selectedTeam) {
    const resolvedId = resolveTeamCategoryId(selectedTeam, tournamentCategories);
    const matched = tournamentCategories.some((c) => c.id === resolvedId);
    const currentGroup = selectedTeam.group?.trim().toUpperCase() === "B" ? "B" : selectedTeam.group?.trim().toUpperCase() === "A" ? "A" : "";

    return (
      <div>
        <PrimaryButton onClick={() => setSelectedTeamId(null)} style={{ marginBottom: 16 }}>
          ← All teams
        </PrimaryButton>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
          <TeamAvatar team={selectedTeam} size={64} />
          <div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28 }}>
              {selectedTeam.teamName || "Untitled team"}
            </div>
            <div style={{ fontSize: 13.5, color: theme.color.textMuted, marginTop: 4 }}>
              {[
                categoryLabelById.get(resolvedId) ?? selectedTeam.category,
                selectedTeam.teamCaptainName ? `Captain ${selectedTeam.teamCaptainName}` : null,
                selectedTeam.status,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>
              {selectedPlayers.length} player{selectedPlayers.length === 1 ? "" : "s"} assigned
            </div>
          </div>
        </div>

        <Card style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Standings placement</div>
          <div style={{ fontSize: 13, color: theme.color.textMuted, marginBottom: 12, lineHeight: 1.45 }}>
            Standings uses the same category buckets as these pills. If a team is in the wrong oval or missing
            Group A/B, fix it here — that updates the registration doc Standings reads.
          </div>

          {!matched && (
            <div style={{ fontSize: 13, color: theme.color.danger, fontWeight: 600, marginBottom: 10 }}>
              Unmapped category: registration says &quot;{selectedTeam.category || "(empty)"}&quot;. Assign a
              tournament category below so it appears under the right Standings pill.
            </div>
          )}

          <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Tournament category</label>
          <select
            value={matched ? resolvedId : ""}
            disabled={saving}
            onChange={(e) => {
              const selected = tournamentCategories.find((c) => c.id === e.target.value);
              if (!selected) return;
              void saveTeamFields({ categoryId: selected.id, category: selected.label });
            }}
            style={{
              width: "100%",
              maxWidth: 420,
              padding: "10px 12px",
              borderRadius: theme.radius.sm,
              border: `1px solid ${theme.color.border}`,
              fontSize: 13.5,
              marginBottom: 14,
            }}
          >
            <option value="">{matched ? "Select a category…" : `Keep unmapped (“${selectedTeam.category}”)`}</option>
            {tournamentCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Pool / group</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {(["", "A", "B"] as const).map((g) => (
              <Pill
                key={g || "none"}
                active={currentGroup === g}
                onClick={() => {
                  if (saving) return;
                  void saveTeamFields({ group: g || null });
                }}
              >
                {g ? `Group ${g}` : "No group"}
              </Pill>
            ))}
          </div>
          <div style={{ fontSize: 12, color: theme.color.textMuted, lineHeight: 1.4 }}>
            Leave as &quot;No group&quot; for a flat Teams list on Standings. Set A/B only when pools are assigned.
          </div>
          {saveError && (
            <div style={{ color: theme.color.danger, fontSize: 13, marginTop: 10 }}>{saveError}</div>
          )}
          {saving && (
            <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 10 }}>Saving…</div>
          )}
        </Card>

        <TeamOfficialsCard teamId={selectedTeam.id} categoryId={matched ? resolvedId : null} players={selectedPlayers} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedPlayers.map((player) => {
            const playerKey = player.profileId?.trim() || player.id;
            return (
              <PlayerRow
                key={player.id}
                player={player}
                jerseyNumber={jerseyByPlayerKey.get(playerKey)}
                onSaveJersey={(num) =>
                  setJerseyNumber({ teamId: selectedTeam.id, playerKey, categoryId: resolvePlayerCategoryId(player), jerseyNumber: num })
                }
              />
            );
          })}
          {selectedPlayers.length === 0 && (
            <div style={{ color: theme.color.danger, fontWeight: 700, fontSize: 13.5 }}>No players assigned.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid-kpi-3" style={{ marginBottom: 20 }}>
        <Kpi label="Teams" value={loading ? "…" : String(teams.length)} />
        <Kpi label="Players assigned" value={loading ? "…" : String(players.filter((p) => p.teamId?.trim()).length)} />
        <Kpi
          label="Teams with 0 players"
          value={loading ? "…" : String(rows.filter((r) => r.playerCount === 0).length)}
          accent
        />
      </div>

      <input
        placeholder="Search by team, captain, or email…"
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <FilterDropdown
          label="Team"
          value={teamFilter}
          options={teamOptions}
          onChange={setTeamFilter}
        />
        <FilterDropdown
          label="Category"
          value={campCategoryId ?? categoryFilter}
          options={buckets.map((c) => ({ id: c.id, label: `${c.label} (${c.count})${!c.matched ? " !" : ""}` }))}
          onChange={(id) => {
            // Toddlers Camp categories bypass the team list entirely (see
            // the comment on campCategoryId above) — picking one jumps
            // straight to its flat camper list instead of filtering rows.
            if (id && TODDLERS_CAMP_CATEGORY_LABELS[id]) {
              setCampCategoryId(id);
            } else {
              setCampCategoryId(null);
              setCategoryFilter(id);
            }
          }}
        />
      </div>

      {(teamFilter || categoryFilter) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {teamFilter && (
            <FilterChip label={teamOptions.find((t) => t.id === teamFilter)?.label ?? "Team"} onRemove={() => setTeamFilter(null)} />
          )}
          {categoryFilter && (
            <FilterChip label={categoryLabelById.get(categoryFilter) ?? "Category"} onRemove={() => setCategoryFilter(null)} />
          )}
        </div>
      )}

      <div className="grid-kpi-3" style={{ marginBottom: 20 }}>
        <Kpi label="Players registered" value={loading ? "…" : String(filteredKpis.registered)} />
        <Kpi label="Checked-in" value={loading ? "…" : String(filteredKpis.checkedIn)} />
        <Kpi label="Assigned jersey #s" value={loading ? "…" : String(filteredKpis.jerseyed)} />
      </div>

      {error && (
        <div style={{ color: theme.color.danger, fontSize: 13.5, marginBottom: 12 }}>
          Couldn't load registration teams: {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ team, playerCount, jerseyCount, resolvedCategoryId }) => {
          const bucket = buckets.find((b) => b.id === resolvedCategoryId);
          const allJerseyed = playerCount > 0 && jerseyCount >= playerCount;
          return (
            <Card
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              style={{
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <TeamAvatar team={team} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{team.teamName || "Untitled team"}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {[
                      categoryLabelById.get(resolvedCategoryId) ?? team.category,
                      team.group ? `Group ${team.group}` : null,
                      team.teamCaptainName ? `Captain ${team.teamCaptainName}` : null,
                      bucket && !bucket.matched ? "needs category fix" : null,
                      team.status,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>
                  {playerCount}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: playerCount === 0 ? theme.color.danger : theme.color.textMuted, marginBottom: 4 }}>
                  {playerCount === 1 ? "player" : "players"}
                </div>
                {playerCount > 0 && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: "3px 9px",
                      background: allJerseyed ? theme.color.successBg : "#F1EFF5",
                      color: allJerseyed ? theme.color.success : theme.color.textMuted,
                    }}
                  >
                    {jerseyCount}/{playerCount} jerseys
                  </span>
                )}
              </div>
            </Card>
          );
        })}
        {!loading && rows.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No teams match.</div>
        )}
        {loading && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Loading teams…</div>}
      </div>
    </div>
  );
}

/**
 * Staff-side view of the same officials system CaptainRoster.tsx's
 * AddTeamOfficialPanel offers self-serve — one merged list covering both
 * appointed co-captains (rosterCheckIns.appointedCaptain, keyed by playerKey)
 * and coach/managers (Team.coachManagerUids, keyed by account uid), each
 * removable and capped at MAX_TEAM_OFFICIALS combined. Deliberately excludes
 * the team's real registration captain (captainProfileId, shown separately
 * above via teamCaptainName) — nothing here can touch that field; see
 * assignTeamOfficial's top comment for why.
 */
function TeamOfficialsCard({
  teamId,
  categoryId,
  players,
}: {
  teamId: string;
  /** Null when this team's category is unmapped (see the "needs category fix" banner above) — appointing a captain needs a real categoryId to key the roster doc, so that path is disabled until it's fixed. */
  categoryId: string | null;
  players: RegisteredPlayer[];
}) {
  const { data: users } = useAllUsers();
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const playerByKey = useMemo(() => new Map(players.map((p) => [p.profileId?.trim() || p.id, p])), [players]);

  const [coachManagerUids, setCoachManagerUids] = useState<string[]>([]);
  const [appointedCaptains, setAppointedCaptains] = useState<{ playerKey: string; categoryId: string }[]>([]);
  const [kind, setKind] = useState<OfficialKind>("captain");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, COLLECTIONS.teams, teamId),
      (snap) => setCoachManagerUids(snap.exists() ? (snap.data().coachManagerUids ?? []) : []),
      () => setCoachManagerUids([])
    );
  }, [teamId]);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.rosterCheckIns), where("teamId", "==", teamId), where("appointedCaptain", "==", true));
    return onSnapshot(
      q,
      (snap) => setAppointedCaptains(snap.docs.map((d) => ({ playerKey: d.data().userId as string, categoryId: d.data().categoryId as string }))),
      () => setAppointedCaptains([])
    );
  }, [teamId]);

  const totalCount = appointedCaptains.length + coachManagerUids.length;
  const atCap = totalCount >= MAX_TEAM_OFFICIALS;

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !categoryId) return [];
    const appointedKeys = new Set(appointedCaptains.map((c) => c.playerKey));
    return players
      .filter((p) => {
        const key = p.profileId?.trim() || p.id;
        if (appointedKeys.has(key)) return false;
        return `${p.firstName ?? ""} ${p.lastName ?? ""}`.toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [search, players, categoryId, appointedCaptains]);

  async function addCaptain(player: RegisteredPlayer) {
    if (!categoryId) return;
    setBusy(true);
    setError(null);
    try {
      await assignTeamOfficial({ teamId, kind: "captain", categoryId, playerKey: player.profileId?.trim() || player.id, targetUid: player.uid });
      setSearch("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that captain.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCaptain(playerKey: string, catId: string) {
    setBusy(true);
    setError(null);
    try {
      await removeTeamOfficial({ teamId, kind: "captain", categoryId: catId, playerKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that captain.");
    } finally {
      setBusy(false);
    }
  }

  async function addManagerCoach() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await assignTeamOfficial({ teamId, kind: "manager_coach", email: trimmed });
      setEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that manager/coach.");
    } finally {
      setBusy(false);
    }
  }

  async function removeManagerCoach(uid: string) {
    setBusy(true);
    setError(null);
    try {
      await removeTeamOfficial({ teamId, kind: "manager_coach", uid });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that manager/coach.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 16, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Team officials</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: atCap ? theme.color.danger : theme.color.textMuted }}>
          {totalCount}/{MAX_TEAM_OFFICIALS}
        </div>
      </div>
      <div style={{ fontSize: 13, color: theme.color.textMuted, marginBottom: 12, lineHeight: 1.45 }}>
        Captains and managers/coaches share the same jersey-editing and complaint tools — a manager/coach doesn't
        have to be a registered player themselves, but needs to have signed into the app at least once.
      </div>

      {(appointedCaptains.length > 0 || coachManagerUids.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {appointedCaptains.map(({ playerKey, categoryId: catId }) => {
            const p = playerByKey.get(playerKey);
            const name = p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : playerKey;
            return (
              <OfficialRow key={`captain-${playerKey}`} name={name || playerKey} kind="captain" busy={busy} onRemove={() => removeCaptain(playerKey, catId)} />
            );
          })}
          {coachManagerUids.map((uid) => {
            const u = userById.get(uid);
            return (
              <OfficialRow key={`manager-${uid}`} name={u?.displayName ?? uid} sub={u?.email} kind="manager_coach" busy={busy} onRemove={() => removeManagerCoach(uid)} />
            );
          })}
        </div>
      )}

      {atCap ? (
        <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>Team officials full — remove one to add another.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(["captain", "manager_coach"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: theme.radius.sm,
                  border: `1px solid ${kind === k ? theme.color.purple : theme.color.border}`,
                  background: kind === k ? theme.color.purple : "none",
                  color: kind === k ? "#fff" : theme.color.text,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {OFFICIAL_KIND_LABELS[k]}
              </button>
            ))}
          </div>

          {kind === "captain" ? (
            categoryId ? (
              <>
                <input
                  placeholder="Search roster by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={busy}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 8 }}
                />
                {matches.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {matches.map((p) => (
                      <button
                        key={p.id}
                        disabled={busy}
                        onClick={() => addCaptain(p)}
                        style={{ textAlign: "left", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, background: "#F7F6F3", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      >
                        {`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unnamed player"}
                      </button>
                    ))}
                  </div>
                )}
                {search.trim() && matches.length === 0 && (
                  <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>No match on this roster.</div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>
                Fix this team's category above before appointing a captain.
              </div>
            )
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="Email address…"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                style={{ flex: 1, minWidth: 200, padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
              />
              <PrimaryButton onClick={addManagerCoach} disabled={busy || !email.trim()}>
                {busy ? "Adding…" : "+ ADD"}
              </PrimaryButton>
            </div>
          )}
        </>
      )}
      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}
    </Card>
  );
}

function OfficialRow({
  name,
  sub,
  kind,
  busy,
  onRemove,
}: {
  name: string;
  sub?: string;
  kind: OfficialKind;
  busy: boolean;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#F7F6F3", borderRadius: theme.radius.sm, gap: 12 }}>
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 0.3,
            color: kind === "captain" ? theme.color.purple : theme.color.navy,
            border: `1px solid ${kind === "captain" ? theme.color.purple : theme.color.navy}`,
            borderRadius: 4,
            padding: "2px 6px",
            flexShrink: 0,
          }}
        >
          {OFFICIAL_KIND_LABELS[kind].toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{name}</div>
          {sub && <div style={{ fontSize: 12, color: theme.color.textMuted }}>{sub}</div>}
        </div>
      </div>
      <button
        disabled={busy}
        onClick={onRemove}
        style={{ background: "none", border: "none", color: theme.color.danger, fontWeight: 700, fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}
      >
        Remove
      </button>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div
      onClick={onRemove}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#F1EFF5",
        color: theme.color.purple,
        padding: "5px 6px 5px 12px",
        borderRadius: theme.radius.pill,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(139,47,209,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✕</span>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: theme.color.textMuted }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28, marginTop: 4, color: accent ? theme.color.danger : theme.color.text }}>
        {value}
      </div>
    </Card>
  );
}

/**
 * Shared row for both a real team's roster and a camp category's flat
 * camper list — jersey editing (jerseyNumber/onSaveJersey) is optional
 * since camp categories are non-competitive and have no jersey numbers.
 * Admin has the same override power here setJerseyNumber grants
 * captains/coach-managers: reassigning a number already worn by a
 * teammate bumps them off it rather than getting blocked.
 */
function PlayerRow({
  player,
  jerseyNumber,
  onSaveJersey,
}: {
  player: RegisteredPlayer;
  jerseyNumber?: number;
  onSaveJersey?: (jerseyNumber: number) => Promise<unknown>;
}) {
  const name = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const num = Number(draft);
    if (!draft || Number.isNaN(num) || num < 0 || num > 999) return setError("Enter a valid number (0–999).");
    if (!onSaveJersey) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveJersey(num);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that number.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {player.profilePicture ? (
            <img src={player.profilePicture} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
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
              }}
            >
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{name}</div>
            <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
              {[player.email, player.status].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        {onSaveJersey && !editing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 15, color: theme.color.text }}>
              {jerseyNumber !== undefined ? `#${jerseyNumber}` : "#—"}
            </span>
            <button
              onClick={() => { setEditing(true); setDraft(String(jerseyNumber ?? "")); setError(null); }}
              style={{ background: "none", border: `1.5px solid ${theme.color.purple}`, color: theme.color.purple, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {onSaveJersey && editing && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            autoFocus
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            style={{ width: 50, padding: 6, borderRadius: 6, border: `1px solid ${theme.color.border}` }}
          />
          <button
            disabled={saving}
            onClick={submit}
            style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {saving ? "Submitting…" : "Submit"}
          </button>
          <button onClick={() => { setEditing(false); setError(null); }} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12, cursor: "pointer" }}>
            Cancel
          </button>
          {error && <span style={{ color: theme.color.danger, fontSize: 12.5 }}>{error}</span>}
        </div>
      )}
    </Card>
  );
}
