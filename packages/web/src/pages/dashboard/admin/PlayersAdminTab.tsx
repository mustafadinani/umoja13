import { useMemo, useState } from "react";
import type { CheckIn } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllCheckIns } from "../../../hooks/useData";
import { useRegisteredPlayers, useRegisteredTeamsRaw } from "../../../hooks/useRegistration";
import { Card, Pill } from "../../../components/ui";

function hasSubmittedCheckIn(checkIns: CheckIn[], playerUid: string, teamId: string): boolean {
  if (!playerUid) return false;
  return checkIns.some((c) => {
    if (c.userId !== playerUid) return false;
    if (teamId && c.teamId && c.teamId !== teamId) return false;
    return c.status !== "not_started";
  });
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) {
      map.set(t.id, t.teamName?.trim() || "Untitled team");
    }
    return map;
  }, [teams]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) {
      if (p.category?.trim()) set.add(p.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [players]);

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
        return { player: p, teamId, teamName, hasTeam, checkedIn };
      })
      .filter(({ player, hasTeam }) => {
        if (unassignedOnly && hasTeam) return false;
        if (categoryFilter && (player.category?.trim() ?? "") !== categoryFilter) return false;
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
  }, [players, teamNameById, checkIns, search, categoryFilter, unassignedOnly]);

  const unassignedCount = players.filter((p) => !p.teamId?.trim()).length;
  const loading = playersLoading || teamsLoading || checkInsLoading;
  const error = playersError || teamsError;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <Kpi label="Registered players" value={loading ? "…" : String(players.length)} />
        <Kpi label="With a team" value={loading ? "…" : String(players.length - unassignedCount)} />
        <Kpi label="No team assigned" value={loading ? "…" : String(unassignedCount)} accent={unassignedCount > 0} />
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
        {categories.map((c) => (
          <Pill key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>{c}</Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <Pill active={!unassignedOnly} onClick={() => setUnassignedOnly(false)}>All players</Pill>
        <Pill active={unassignedOnly} onClick={() => setUnassignedOnly(true)}>No team assigned</Pill>
      </div>

      {error && (
        <div style={{ color: theme.color.danger, fontSize: 13.5, marginBottom: 12 }}>
          Couldn't load registration players: {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ player, teamName, hasTeam, checkedIn }) => {
          const displayName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
          return (
            <Card key={player.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {[player.category, player.email, player.status].filter(Boolean).join(" · ")}
                  </div>
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
