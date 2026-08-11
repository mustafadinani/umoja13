import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import {
  COLLECTIONS,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  TEAMS_REGISTERED,
  TODDLERS_CAMP_CATEGORY_LABELS,
  resolveTeamCategoryId,
  type RegisteredPlayer,
  type RegisteredTeam,
} from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllUsers, useCategories } from "../../../hooks/useData";
import {
  useRegisteredPlayers,
  useRegisteredTeamsRaw,
  useRegistrationCategoryBuckets,
} from "../../../hooks/useRegistration";
import { assignTeamManager, removeTeamManager } from "../../../lib/callables";
import { db, defaultDb } from "../../../lib/firebase";
import { Card, Pill, PrimaryButton } from "../../../components/ui";

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

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams
      .map((team) => ({
        team,
        resolvedCategoryId: resolveTeamCategoryId(team, tournamentCategories),
        playerCount: playersByTeamId.get(team.id)?.length ?? 0,
      }))
      .filter(({ team, resolvedCategoryId }) => {
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
  }, [teams, playersByTeamId, search, categoryFilter, tournamentCategories]);

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

        <CoachManagerCard teamId={selectedTeam.id} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedPlayers.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
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

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!categoryFilter && !campCategoryId} onClick={() => { setCategoryFilter(null); setCampCategoryId(null); }}>All categories</Pill>
        {buckets.map((c) => (
          <Pill
            key={c.id}
            active={campCategoryId === c.id || categoryFilter === c.id}
            onClick={() => (TODDLERS_CAMP_CATEGORY_LABELS[c.id] ? setCampCategoryId(c.id) : setCategoryFilter(c.id))}
          >
            {c.label} ({c.count})
            {!c.matched ? " !" : ""}
          </Pill>
        ))}
      </div>

      {error && (
        <div style={{ color: theme.color.danger, fontSize: 13.5, marginBottom: 12 }}>
          Couldn't load registration teams: {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ team, playerCount, resolvedCategoryId }) => {
          const bucket = buckets.find((b) => b.id === resolvedCategoryId);
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
                <div style={{ fontSize: 11, fontWeight: 700, color: playerCount === 0 ? theme.color.danger : theme.color.textMuted }}>
                  {playerCount === 1 ? "player" : "players"}
                </div>
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
 * Attaches an account to this team as a coach/manager — independent of
 * registration data, since (unlike the real captain, resolved automatically
 * from the registration record above) a coach/manager isn't necessarily a
 * registered player themselves. Lives on the umoja13-app/teams/{id} overlay
 * doc (Team.coachManagerUids), which this subscribes to directly since
 * everything else in this tab reads the raw registration doc instead.
 */
function CoachManagerCard({ teamId }: { teamId: string }) {
  const { data: users } = useAllUsers();
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const [coachManagerUids, setCoachManagerUids] = useState<string[]>([]);
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

  async function add() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await assignTeamManager({ teamId, email: trimmed });
      setEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that coach/manager.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(uid: string) {
    setBusy(true);
    setError(null);
    try {
      await removeTeamManager({ teamId, uid });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that coach/manager.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 16, padding: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Coach / Manager</div>
      <div style={{ fontSize: 13, color: theme.color.textMuted, marginBottom: 12, lineHeight: 1.45 }}>
        Same jersey-editing and complaint tools as this team's real captain, for someone who isn't necessarily a
        registered player themselves. They need to have signed into the app at least once already.
      </div>

      {coachManagerUids.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {coachManagerUids.map((uid) => {
            const u = userById.get(uid);
            return (
              <div key={uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#F7F6F3", borderRadius: theme.radius.sm }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u?.displayName ?? uid}</div>
                  {u?.email && <div style={{ fontSize: 12, color: theme.color.textMuted }}>{u.email}</div>}
                </div>
                <button
                  disabled={busy}
                  onClick={() => remove(uid)}
                  style={{ background: "none", border: "none", color: theme.color.danger, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Email address…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          style={{ flex: 1, minWidth: 200, padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        <PrimaryButton onClick={add} disabled={busy || !email.trim()}>
          {busy ? "Adding…" : "+ ADD"}
        </PrimaryButton>
      </div>
      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}
    </Card>
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

/** Shared row for both a real team's roster and a camp category's flat camper list. */
function PlayerRow({ player }: { player: RegisteredPlayer }) {
  const name = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
  return (
    <Card style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
    </Card>
  );
}
