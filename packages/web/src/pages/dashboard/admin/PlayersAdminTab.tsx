import { useMemo, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  PLAYERS_REGISTERED,
  REGISTRATION_ROOT,
  REGISTRATION_YEAR,
  COLLECTIONS,
  type Category,
  type CheckIn,
  type RegisteredPlayer,
  type UserProfile,
} from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllCheckIns, useCategories } from "../../../hooks/useData";
import { useRegisteredPlayers, useRegisteredTeamsRaw } from "../../../hooks/useRegistration";
import { Card, Pill } from "../../../components/ui";
import { db, defaultDb } from "../../../lib/firebase";

function hasSubmittedCheckIn(checkIns: CheckIn[], playerUid: string, teamId: string): boolean {
  if (!playerUid) return false;
  return checkIns.some((c) => {
    if (c.userId !== playerUid) return false;
    if (teamId && c.teamId && c.teamId !== teamId) return false;
    return c.status !== "not_started";
  });
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolve a registration player's category against umoja13-app / categories. */
function matchPlayerCategory(
  player: RegisteredPlayer,
  categories: Category[]
): { categoryId: string; matched: Category | null; rawDisplay: string } {
  const byId = player.categoryId?.trim() ?? "";
  if (byId) {
    const matched = categories.find((c) => c.id === byId) ?? null;
    return {
      categoryId: byId,
      matched,
      rawDisplay: matched?.label ?? byId,
    };
  }

  const label = player.category?.trim() ?? "";
  if (!label) {
    return { categoryId: "", matched: null, rawDisplay: "" };
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
    return { categoryId: byLabel.id, matched: byLabel, rawDisplay: label };
  }

  // Older rows sometimes stored a UUID in `category` instead of a label.
  const asId = categories.find((c) => c.id === label) ?? null;
  if (asId) {
    return { categoryId: asId.id, matched: asId, rawDisplay: asId.label };
  }

  return { categoryId: label, matched: null, rawDisplay: label };
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [invalidOnly, setInvalidOnly] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) {
      map.set(t.id, t.teamName?.trim() || "Untitled team");
    }
    return map;
  }, [teams]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

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
        const checkedIn = hasSubmittedCheckIn(checkIns, p.uid || "", teamId);
        const categoryMatch = matchPlayerCategory(p, categories);
        return { player: p, teamId, teamName, hasTeam, checkedIn, categoryMatch };
      })
      .filter(({ player, hasTeam, categoryMatch }) => {
        if (unassignedOnly && hasTeam) return false;
        if (invalidOnly && categoryMatch.matched) return false;
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
  }, [players, teamNameById, checkIns, search, categoryFilter, unassignedOnly, invalidOnly, categories]);

  const unassignedCount = players.filter((p) => !p.teamId?.trim()).length;
  const invalidCategoryCount = players.filter((p) => !matchPlayerCategory(p, categories).matched).length;
  const loading = playersLoading || teamsLoading || checkInsLoading || categoriesLoading;
  const error = playersError || teamsError;

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

  return (
    <div>
      <div className="grid-kpi-4" style={{ marginBottom: 20 }}>
        <Kpi label="Registered players" value={loading ? "…" : String(players.length)} />
        <Kpi label="With a team" value={loading ? "…" : String(players.length - unassignedCount)} />
        <Kpi label="No team assigned" value={loading ? "…" : String(unassignedCount)} accent={unassignedCount > 0} />
        <Kpi
          label="Invalid category"
          value={loading ? "…" : String(invalidCategoryCount)}
          accent={invalidCategoryCount > 0}
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

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <Pill active={!categoryFilter} onClick={() => setCategoryFilter(null)}>All categories</Pill>
        {filterLabels.map((c) => (
          <Pill key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>{c}</Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!unassignedOnly && !invalidOnly} onClick={() => { setUnassignedOnly(false); setInvalidOnly(false); }}>
          All players
        </Pill>
        <Pill active={unassignedOnly} onClick={() => { setUnassignedOnly(true); setInvalidOnly(false); }}>
          No team assigned
        </Pill>
        <Pill active={invalidOnly} onClick={() => { setInvalidOnly(true); setUnassignedOnly(false); }}>
          Invalid category
        </Pill>
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
        {rows.map(({ player, teamName, hasTeam, checkedIn, categoryMatch }) => {
          const displayName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
          const invalid = !categoryMatch.matched;
          return (
            <Card
              key={player.id}
              style={{
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                borderColor: invalid ? theme.color.danger : undefined,
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

                  {invalid && (
                    <div
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
                ) : (
                  <div style={{ fontWeight: 800, fontSize: 13, color: theme.color.danger }}>No team assigned.</div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 4,
                    color: checkedIn ? theme.color.success : theme.color.textMuted,
                  }}
                >
                  {checkedIn ? "Checked in." : "Not checked in."}
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
