import { useMemo, useState } from "react";
import type { RegisteredPlayer, RegisteredTeam } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useRegisteredPlayers, useRegisteredTeamsRaw } from "../../../hooks/useRegistration";
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
 * Click a team to see its assigned playersRegistered roster.
 */
export function TeamsAdminTab() {
  const { data: teams, loading: teamsLoading, error: teamsError } = useRegisteredTeamsRaw();
  const { data: players, loading: playersLoading, error: playersError } = useRegisteredPlayers();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of teams) {
      if (t.category?.trim()) set.add(t.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [teams]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams
      .map((team) => ({
        team,
        playerCount: playersByTeamId.get(team.id)?.length ?? 0,
      }))
      .filter(({ team }) => {
        if (categoryFilter && (team.category?.trim() ?? "") !== categoryFilter) return false;
        if (!q) return true;
        return (
          (team.teamName ?? "").toLowerCase().includes(q) ||
          (team.teamCaptainName ?? "").toLowerCase().includes(q) ||
          (team.email ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.team.teamName ?? "").localeCompare(b.team.teamName ?? ""));
  }, [teams, playersByTeamId, search, categoryFilter]);

  const selectedTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) ?? null : null;
  const selectedPlayers = selectedTeamId ? playersByTeamId.get(selectedTeamId) ?? [] : [];
  const loading = teamsLoading || playersLoading;
  const error = teamsError || playersError;

  if (selectedTeam) {
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
              {[selectedTeam.category, selectedTeam.teamCaptainName ? `Captain ${selectedTeam.teamCaptainName}` : null, selectedTeam.status]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>
              {selectedPlayers.length} player{selectedPlayers.length === 1 ? "" : "s"} assigned
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedPlayers.map((player) => {
            const name = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
            return (
              <Card key={player.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
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
        <Pill active={!categoryFilter} onClick={() => setCategoryFilter(null)}>All categories</Pill>
        {categories.map((c) => (
          <Pill key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>{c}</Pill>
        ))}
      </div>

      {error && (
        <div style={{ color: theme.color.danger, fontSize: 13.5, marginBottom: 12 }}>
          Couldn't load registration teams: {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(({ team, playerCount }) => (
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
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <TeamAvatar team={team} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{team.teamName || "Untitled team"}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {[team.category, team.teamCaptainName ? `Captain ${team.teamCaptainName}` : null, team.status]
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
        ))}
        {!loading && rows.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No teams match.</div>
        )}
        {loading && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Loading teams…</div>}
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
