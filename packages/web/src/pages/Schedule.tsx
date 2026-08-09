import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  GAME_FIELDS,
  TODDLER_CAMP_HIGHLIGHT_NOTE,
  TODDLER_CAMP_NOTE,
  TODDLER_CAMP_SCHEDULE,
  TOURNAMENT_DAY_DATES,
  compareGamesByKickoff,
  formatKickoffTime,
  provisionalSideLabel,
  type Game,
} from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCategories, useGames, useSponsors, useTeams } from "../hooks/useData";
import { FilterDropdown, Pill, StatusBadge } from "../components/ui";
import { SponsorStrip } from "../components/SponsorStrip";
import { FieldMapCard } from "../components/FieldMapCard";

const DAYS: { id: Game["day"]; label: string }[] = [
  { id: "fri", label: `Fri, ${TOURNAMENT_DAY_DATES.fri}` },
  { id: "sat", label: `Sat, ${TOURNAMENT_DAY_DATES.sat}` },
  { id: "sun", label: `Sun, ${TOURNAMENT_DAY_DATES.sun}` },
];
/** Short "FRI · AUG 14" tile label — day abbreviation always paired with its actual date, since a bare "FRI"/"SAT"/"SUN" doesn't say which one. */
function dayDateLabel(day: Game["day"]) {
  return `${day.toUpperCase()} · ${TOURNAMENT_DAY_DATES[day].toUpperCase()}`;
}

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

  const filtered = games
    .filter((g) => {
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
    })
    .sort(compareGamesByKickoff);

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
            <FilterDropdown label="Field" value={field} options={GAME_FIELDS.map((f) => ({ id: f, label: f }))} onChange={setField} />
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
              const homeGoals = g.homeScore ?? 0;
              const awayGoals = g.awayScore ?? 0;

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
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                      {home?.name ?? <Provisional>{provisionalSideLabel(g.homeDrawPos, g.homeRef) ?? "TBD"}</Provisional>} vs{" "}
                      {away?.name ?? <Provisional>{provisionalSideLabel(g.awayDrawPos, g.awayRef) ?? "TBD"}</Provisional>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusBadge status={g.status} />
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.color.textMuted, letterSpacing: 0.3, marginTop: 6 }}>
                      {dayDateLabel(g.day)}
                    </div>
                    <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>
                      {g.status === "scheduled" ? formatKickoffTime(g.kickoffTime) : `${homeGoals}–${awayGoals}`}
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

      <ToddlerCampScheduleCard />
    </div>
  );
}

const DAY_LABEL: Record<Game["day"], string> = { fri: "Friday", sat: "Saturday", sun: "Sunday" };

/**
 * Umoja Soccer Camp (Toddlers, ages 3-6) doesn't play real Games — no team
 * vs. team matches, so it never shows up in the filtered list above. This is
 * its own static itinerary, always visible on Game Day regardless of the
 * team/category filters (which only ever apply to real Games).
 */
function ToddlerCampScheduleCard() {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        🍼 TODDLER SOCCER CAMP
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14 }}>
        Ages 3–6 · non-competitive, so it won't show up in the games list above.
      </div>

      <div className="grid-3">
        {(["fri", "sat", "sun"] as const).map((day) => (
          <div key={day} style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 10 }}>
              {DAY_LABEL[day].toUpperCase()} <span style={{ color: theme.color.textMuted, fontWeight: 600 }}>· {TOURNAMENT_DAY_DATES[day]}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TODDLER_CAMP_SCHEDULE.filter((s) => s.day === day).map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: "9px 11px",
                    borderRadius: theme.radius.sm,
                    background: s.highlight ? theme.color.purpleLight + "22" : "#F7F6F3",
                    border: s.highlight ? `1px solid ${theme.color.purple}` : "1px solid transparent",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                    {s.start}{s.end ? `–${s.end}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                    {s.group} · {s.activity}
                  </div>
                  <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 1 }}>{s.location}</div>
                  {s.highlight && (
                    <div style={{ fontSize: 11.5, color: theme.color.purple, fontWeight: 700, marginTop: 4 }}>
                      ⭐ {TODDLER_CAMP_HIGHLIGHT_NOTE}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>{TODDLER_CAMP_NOTE}</div>
    </div>
  );
}

/** A not-yet-real team side — "Team 3", "Seed 1", "Winner of QF2" — styled distinctly from a resolved team name so it reads as provisional, not as a typo. */
function Provisional({ children }: { children: ReactNode }) {
  return <span style={{ color: theme.color.textMuted, fontStyle: "italic", fontWeight: 500 }}>{children}</span>;
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
