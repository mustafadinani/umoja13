import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FIELDS, type Game } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useGames, useSponsors, useTeams } from "../hooks/useData";
import { FilterDropdown, Pill, StatusBadge } from "../components/ui";
import { SponsorStrip } from "../components/SponsorStrip";
import { FieldMapCard } from "../components/FieldMapCard";

const DAYS: { id: Game["day"]; label: string }[] = [
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

export function Schedule() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: categories } = useCategories();
  const { data: teams } = useTeams();
  const { data: games } = useGames();
  const { data: sponsors } = useSponsors();
  const [day, setDay] = useState<Game["day"] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [myTeamsOnly, setMyTeamsOnly] = useState(false);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const myTeamIds = useMemo(() => {
    const ids = new Set<string>(profile?.followedTeamIds ?? []);
    (profile?.playerOf ?? []).forEach((m) => ids.add(m.teamId));
    return ids;
  }, [profile]);

  const filtered = games.filter((g) => {
    if (day && g.day !== day) return false;
    if (categoryId && g.categoryId !== categoryId) return false;
    if (field && g.field !== field) return false;
    if (myTeamsOnly && !myTeamIds.has(g.homeTeamId) && !myTeamIds.has(g.awayTeamId)) return false;
    if (search) {
      const home = teamById.get(g.homeTeamId)?.name ?? "";
      const away = teamById.get(g.awayTeamId)?.name ?? "";
      const category = categories.find((c) => c.id === g.categoryId)?.label ?? "";
      const q = search.toLowerCase();
      const matches = [home, away, category, g.field].some((v) => v.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="page-shell">
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>GAME DAY</div>
      <div style={{ color: theme.color.textMuted, fontSize: 14, marginBottom: 18 }}>
        Search teams, tap a field on the map to filter, or browse below.
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <input
              placeholder="Search by team, category, or field…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 14 }}
            />
            <FilterDropdown<Game["day"]> label="Day" value={day} options={DAYS} onChange={setDay} />
            <FilterDropdown label="Category" value={categoryId} options={categories.map((c) => ({ id: c.id, label: c.label }))} onChange={setCategoryId} />
            <FilterDropdown label="Field" value={field} options={FIELDS.map((f) => ({ id: f, label: f }))} onChange={setField} />
            {profile && (
              <Pill active={myTeamsOnly} onClick={() => setMyTeamsOnly((v) => !v)} bg={myTeamsOnly ? theme.color.gold : undefined} fg={myTeamsOnly ? theme.color.navy : undefined}>
                ★ My teams
              </Pill>
            )}
          </div>

          {(day || categoryId || field || myTeamsOnly) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {day && <FilterChip label={DAYS.find((d) => d.id === day)?.label ?? day} onRemove={() => setDay(null)} />}
              {categoryId && <FilterChip label={categories.find((c) => c.id === categoryId)?.label ?? categoryId} onRemove={() => setCategoryId(null)} />}
              {field && <FilterChip label={field} onRemove={() => setField(null)} />}
              {myTeamsOnly && <FilterChip label="★ My teams" onRemove={() => setMyTeamsOnly(false)} />}
              <div
                onClick={() => { setDay(null); setCategoryId(null); setField(null); setMyTeamsOnly(false); }}
                style={{ display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, color: theme.color.textMuted, cursor: "pointer", padding: "5px 6px" }}
              >
                Clear all
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((g) => {
              const home = teamById.get(g.homeTeamId);
              const away = teamById.get(g.awayTeamId);
              const isMine = myTeamIds.has(g.homeTeamId) || myTeamIds.has(g.awayTeamId);
              const followedTeam = myTeamIds.has(g.homeTeamId) ? home : myTeamIds.has(g.awayTeamId) ? away : null;
              const homeGoals = g.events.filter((e) => e.type === "goal" && e.teamId === g.homeTeamId).length;
              const awayGoals = g.events.filter((e) => e.type === "goal" && e.teamId === g.awayTeamId).length;

              return (
                <div
                  key={g.id}
                  onClick={() => navigate(`/game/${g.id}`)}
                  style={{
                    background: isMine ? "#EFFBF3" : "#fff",
                    border: `1px solid ${isMine ? theme.color.success : theme.color.border}`,
                    borderRadius: theme.radius.md,
                    padding: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginBottom: 4 }}>
                      {categories.find((c) => c.id === g.categoryId)?.label ?? g.categoryId} · {g.field}
                      {followedTeam && (
                        <span style={{ marginLeft: 8, color: followedTeam.color, fontWeight: 700 }}>★ {followedTeam.name.toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{home?.name ?? "TBD"} vs {away?.name ?? "TBD"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusBadge status={g.status} />
                    <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginTop: 6 }}>
                      {g.status === "scheduled" ? g.kickoffTime : `${homeGoals}–${awayGoals}`}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ color: theme.color.textMuted, padding: 20, textAlign: "center" }}>No games match those filters.</div>}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <FieldMapCard games={games} selectedField={field} onSelectField={setField} />
          <SponsorStrip sponsors={sponsors} />
        </div>
      </div>
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
