import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FIELDS, type Game } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useGames, useSponsors, useTeams } from "../hooks/useData";
import { Pill, StatusBadge } from "../components/ui";
import { SponsorStrip } from "../components/SponsorStrip";

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
      const q = search.toLowerCase();
      if (!home.toLowerCase().includes(q) && !away.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>GAME DAY</div>
      <input
        placeholder="Search by team…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "11px 14px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 14.5, margin: "14px 0" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Pill active={!day} onClick={() => setDay(null)}>All days</Pill>
        {DAYS.map((d) => (
          <Pill key={d.id} active={day === d.id} onClick={() => setDay(d.id)}>{d.label}</Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Pill active={!categoryId} onClick={() => setCategoryId(null)}>All categories</Pill>
        {categories.map((c) => (
          <Pill key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.label}</Pill>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!field} onClick={() => setField(null)}>All fields</Pill>
        {FIELDS.map((f) => (
          <Pill key={f} active={field === f} onClick={() => setField(f)}>{f}</Pill>
        ))}
        {profile && (
          <Pill active={myTeamsOnly} onClick={() => setMyTeamsOnly((v) => !v)} bg={myTeamsOnly ? theme.color.gold : undefined} fg={myTeamsOnly ? theme.color.navy : undefined}>
            ★ My teams
          </Pill>
        )}
      </div>

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
              }}
            >
              <div style={{ flex: 1 }}>
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

      <div style={{ marginTop: 32 }}>
        <SponsorStrip sponsors={sponsors} />
      </div>
    </div>
  );
}
