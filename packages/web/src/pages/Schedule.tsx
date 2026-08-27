import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  GAME_FIELDS,
  SOCCER_CAMP,
  TODDLER_CAMP_FIELDS,
  TODDLER_CAMP_HIGHLIGHT_NOTE,
  TODDLER_CAMP_SCHEDULE,
  TOURNAMENT_DAY_DATES,
  compareByDayAndTime,
  formatKickoffTime,
  provisionalSideLabel,
  type Game,
  type Team,
  type ToddlerCampSession,
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

type ScheduleRow = { kind: "game"; game: Game } | { kind: "camp"; session: ToddlerCampSession };

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

  const filteredGames = games.filter((g) => {
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

  // Toddler Camp isn't a real tournament category and has no team of its
  // own — picking a real category (or "My teams") hides it, same as it
  // hides every other category's games. Picking the synthetic "Soccer
  // Camp" entry (added to the dropdown below, alongside the 11 real ones)
  // isolates it instead. Day/field/search still apply either way.
  const isCampFilter = categoryId === SOCCER_CAMP.id;
  const filteredCampSessions = myTeamsOnly || (categoryId && !isCampFilter)
    ? []
    : TODDLER_CAMP_SCHEDULE.filter((s) => {
        if (day && s.day !== day) return false;
        if (field && s.location !== field) return false;
        if (search) {
          const q = search.toLowerCase();
          const matches = ["toddler camp", "umoja soccer camp", s.group, s.activity, s.location].some((v) =>
            v.toLowerCase().includes(q)
          );
          if (!matches) return false;
        }
        return true;
      });

  // One merged, chronologically sorted feed — the camp schedule used to be
  // its own section at the bottom; baking it in here means "what's on Friday
  // at 2pm" actually shows everything happening then, camp included.
  const rows: ScheduleRow[] = [
    ...filteredGames.map((game): ScheduleRow => ({ kind: "game", game })),
    ...filteredCampSessions.map((session): ScheduleRow => ({ kind: "camp", session })),
  ].sort((a, b) =>
    compareByDayAndTime(
      a.kind === "game" ? { day: a.game.day, time: a.game.kickoffTime } : { day: a.session.day, time: a.session.start },
      b.kind === "game" ? { day: b.game.day, time: b.game.kickoffTime } : { day: b.session.day, time: b.session.start }
    )
  );

  const fieldOptions = [...GAME_FIELDS, ...TODDLER_CAMP_FIELDS].map((f) => ({ id: f, label: f }));
  const categoryOptions = [...categories.map((c) => ({ id: c.id, label: c.label })), { id: SOCCER_CAMP.id, label: SOCCER_CAMP.label }];
  const categoryLabelFor = (id: string) => (id === SOCCER_CAMP.id ? SOCCER_CAMP.label : categories.find((c) => c.id === id)?.label ?? id);

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
            <FilterDropdown label="Category" value={categoryId} options={categoryOptions} onChange={setCategoryId} />
            <FilterDropdown label="Field" value={field} options={fieldOptions} onChange={setField} />
            {profile && (
              <Pill active={myTeamsOnly} onClick={() => setMyTeamsOnly((v) => !v)} bg={myTeamsOnly ? theme.color.gold : undefined} fg={myTeamsOnly ? theme.color.navy : undefined}>
                ★ My teams
              </Pill>
            )}
          </div>

          {(day || categoryId || field || myTeamsOnly) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {day && <FilterChip label={DAYS.find((d) => d.id === day)?.label ?? day} onRemove={() => setDay(null)} />}
              {categoryId && <FilterChip label={categoryLabelFor(categoryId)} onRemove={() => setCategoryId(null)} />}
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
            {rows.map((row) =>
              row.kind === "game" ? (
                <GameRow
                  key={row.game.id}
                  game={row.game}
                  home={teamById.get(row.game.homeTeamId)}
                  away={teamById.get(row.game.awayTeamId)}
                  myTeamIds={myTeamIds}
                  categoryLabel={categories.find((c) => c.id === row.game.categoryId)?.label ?? row.game.categoryId}
                  onClick={() => navigate(`/game/${row.game.id}`)}
                />
              ) : (
                <CampSessionRow key={row.session.id} session={row.session} />
              )
            )}
            {rows.length === 0 && <div style={{ color: theme.color.textMuted, padding: 20, textAlign: "center" }}>No games match those filters.</div>}
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

function GameRow({
  game, home, away, myTeamIds, categoryLabel, onClick,
}: {
  game: Game;
  home: Team | undefined;
  away: Team | undefined;
  myTeamIds: Set<string>;
  categoryLabel: string;
  onClick: () => void;
}) {
  const isMine = myTeamIds.has(game.homeTeamId) || myTeamIds.has(game.awayTeamId);
  const followedTeam = myTeamIds.has(game.homeTeamId) ? home : myTeamIds.has(game.awayTeamId) ? away : null;
  const homeGoals = game.homeScore ?? 0;
  const awayGoals = game.awayScore ?? 0;

  return (
    <div
      onClick={onClick}
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
          {categoryLabel} · {game.field}
          {followedTeam && (
            <span style={{ marginLeft: 8, color: followedTeam.color, fontWeight: 700 }}>★ {followedTeam.name.toUpperCase()}</span>
          )}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>
          {home?.name ?? <Provisional>{provisionalSideLabel(game.homeDrawPos, game.homeRef) ?? "TBD"}</Provisional>} vs{" "}
          {away?.name ?? <Provisional>{provisionalSideLabel(game.awayDrawPos, game.awayRef) ?? "TBD"}</Provisional>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <StatusBadge status={game.status} />
        <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.color.textMuted, letterSpacing: 0.3, marginTop: 6 }}>
          {dayDateLabel(game.day)}
        </div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>
          {game.status === "scheduled" ? formatKickoffTime(game.kickoffTime) : `${homeGoals}–${awayGoals}`}
        </div>
      </div>
    </div>
  );
}

/** Same row shape as a Game, but no teams/score — a training block or the Sunday exhibition instead. */
function CampSessionRow({ session }: { session: ToddlerCampSession }) {
  return (
    <div
      style={{
        background: session.highlight ? theme.color.purpleLight + "16" : "#fff",
        border: `1px solid ${session.highlight ? theme.color.purple : theme.color.border}`,
        borderRadius: theme.radius.md,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginBottom: 4 }}>
          🍼 Umoja Soccer Camp · {session.location}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>
          {session.group} · {session.activity}
        </div>
        {session.highlight && (
          <div style={{ fontSize: 12, color: theme.color.purple, fontWeight: 700, marginTop: 4 }}>⭐ {TODDLER_CAMP_HIGHLIGHT_NOTE}</div>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.color.textMuted, letterSpacing: 0.3, marginTop: 6 }}>
          {dayDateLabel(session.day)}
        </div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>
          {formatKickoffTime(session.start)}{session.end ? `–${formatKickoffTime(session.end)}` : ""}
        </div>
      </div>
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
