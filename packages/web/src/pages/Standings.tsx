import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CATEGORIES,
  FESTIVAL_CATEGORY_IDS,
  FORMAT_DESCRIPTIONS,
  TOURNAMENT_DAY_DATES,
  compareGamesByKickoff,
  formatKickoffTime,
  provisionalSideLabel,
  seedDestination,
  type Game,
  type Team,
} from "@umoja/shared";
import { theme } from "../lib/theme";
import { toggleFollowTeam } from "../lib/followTeam";
import { useAuth } from "../auth/AuthProvider";
import { useGames, useSponsors, useTeams } from "../hooks/useData";
import { useRegistrationCategoryBuckets } from "../hooks/useRegistration";
import { Pill, Card } from "../components/ui";
import { SponsorStrip } from "../components/SponsorStrip";

const ROUND_LABELS: Record<Game["round"], string> = {
  group: "Group stage",
  wildcard: "Wild Card",
  qf: "Quarter-Final",
  sf: "Semi-Final",
  final: "Final",
};
const BRACKET_LABELS: Record<NonNullable<Game["bracket"]>, string> = {
  cup: "Cup",
  shield: "Shield",
  classic: "Classic",
};
const BRACKET_COLORS: Record<NonNullable<Game["bracket"]>, { fg: string; bg: string }> = {
  cup: { fg: theme.color.purple, bg: "rgba(139,47,209,.12)" },
  shield: { fg: theme.color.pink, bg: "rgba(236,59,99,.12)" },
  classic: { fg: theme.color.blue, bg: "rgba(37,99,235,.12)" },
};
const ELIMINATED_COLOR = { fg: theme.color.textMuted, bg: theme.color.bg };

// Real <table> cells, not per-row CSS grids — a grid container only shares
// column tracks with itself, so rendering each row as its own `display:grid`
// div (the old approach) let every row auto-size its numeric columns off its
// own content only. A team with "10-2-1" and a team with "2-0-0" would size
// their W-D-L column differently, so headers and every row drifted out of
// alignment with each other. A single <table> shares one set of column
// tracks across the header and every row by construction.
function th(align: "left" | "center" | "right"): React.CSSProperties {
  return {
    textAlign: align,
    padding: "10px 12px",
    fontSize: 11.5,
    fontWeight: 700,
    color: theme.color.textMuted,
    whiteSpace: "nowrap",
  };
}
function td(align: "left" | "center" | "right", extra?: React.CSSProperties): React.CSSProperties {
  return { textAlign: align, padding: "12px 12px", whiteSpace: "nowrap", ...extra };
}
// A soft rule between the results block and the Path to Sunday column —
// without it the two groups read as one run-on row of text.
const pathDivider: React.CSSProperties = { borderLeft: `1px solid ${theme.color.border}`, paddingLeft: 16, whiteSpace: "normal" };

export function Standings() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { buckets, loading: bucketsLoading, error: bucketsError } = useRegistrationCategoryBuckets();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const followed = new Set(profile?.followedTeamIds ?? []);
  const [followError, setFollowError] = useState<string | null>(null);

  async function toggleFollow(teamId: string) {
    if (!user || !profile) return;
    try {
      await toggleFollowTeam(user.uid, profile, teamId);
      setFollowError(null);
    } catch (err) {
      // Previously an uncaught updateDoc against a users/{uid} doc that
      // often doesn't exist for a real Outreach-registered fan — threw
      // NOT_FOUND silently, so the star looked like it did nothing.
      setFollowError(err instanceof Error ? err.message : "Couldn't follow this team — check your connection and try again.");
    }
  }

  // Keep selection valid as buckets load / change — same default as Admin Teams (first pill).
  useEffect(() => {
    if (buckets.length === 0) {
      setCategoryId(null);
      return;
    }
    if (!categoryId || !buckets.some((b) => b.id === categoryId)) {
      setCategoryId(buckets[0].id);
    }
  }, [buckets, categoryId]);

  const activeCategoryId = categoryId ?? buckets[0]?.id ?? null;
  const activeBucket = buckets.find((b) => b.id === activeCategoryId) ?? null;
  const { data: teams, error: teamsError, loading: teamsLoading } = useTeams(activeCategoryId ?? undefined);
  const { data: games } = useGames();
  const { data: sponsors } = useSponsors();

  const isFestival = activeCategoryId ? FESTIVAL_CATEGORY_IDS.includes(activeCategoryId) : false;
  const activeCategory = CATEGORIES.find((c) => c.id === activeCategoryId) ?? null;
  const hasGroups = teams.some((t) => t.group === "A" || t.group === "B");

  /** Only show GROUP headers when at least one team actually has a group assigned. */
  const grouped = useMemo(() => {
    const hasRealGroups = teams.some((t) => t.group === "A" || t.group === "B");
    if (!hasRealGroups) {
      const sorted = [...teams].sort(
        (a, b) =>
          (a.stats.groupRank ?? 99) - (b.stats.groupRank ?? 99) || a.name.localeCompare(b.name)
      );
      return new Map<string, Team[]>([["", sorted]]);
    }
    const byGroup = new Map<string, Team[]>();
    for (const t of teams) {
      const key = t.group ?? "Unassigned";
      byGroup.set(key, [...(byGroup.get(key) ?? []), t]);
    }
    for (const [key, list] of byGroup) {
      byGroup.set(
        key,
        [...list].sort(
          (a, b) =>
            (a.stats.groupRank ?? 99) - (b.stats.groupRank ?? 99) || a.name.localeCompare(b.name)
        )
      );
    }
    return byGroup;
  }, [teams]);

  const bracketGames = games
    .filter((g) => g.categoryId === activeCategoryId && g.round !== "group")
    .sort(compareGamesByKickoff);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const formatDescription = activeCategoryId ? FORMAT_DESCRIPTIONS[activeCategoryId] : undefined;
  const loadError = bucketsError || teamsError;

  return (
    <div className="page-shell-sm" style={{ maxWidth: 900 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>STANDINGS</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {buckets.map((c) => (
          <Pill key={c.id} active={activeCategoryId === c.id} onClick={() => setCategoryId(c.id)}>
            {c.label} ({c.count})
          </Pill>
        ))}
      </div>

      {followError && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "10px 14px", fontSize: 12.5, fontWeight: 700, marginBottom: 16 }}>
          ⚠ {followError}
        </div>
      )}

      {loadError && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: theme.color.danger }}>Couldn't load teams</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 4 }}>{loadError}</div>
        </Card>
      )}

      {activeBucket && !activeBucket.matched && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Unmapped registration category</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, lineHeight: 1.45 }}>
            These teams registered under <strong>{activeBucket.label}</strong>, which doesn't match a tournament
            category. An admin can fix each team in <strong>Admin → Teams</strong> by setting its category to the
            correct tournament division (e.g. Boy&apos;s 10 &amp; Under). Until then they stay in this bucket so
            nothing is hidden.
          </div>
        </Card>
      )}

      {isFestival && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Festival format — every player medals!</div>
          <div style={{ color: theme.color.textMuted, fontSize: 14, marginTop: 6 }}>
            This category doesn't track W-D-L standings or a bracket. Teams registered here are listed below.
          </div>
        </Card>
      )}

      {!isFestival && teams.some((t) => !t.group) && teams.some((t) => t.group === "A" || t.group === "B") && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Some teams are missing a group</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, lineHeight: 1.45 }}>
            Pool/group (A or B) comes from the team&apos;s registration <code>group</code> field (or the matching
            app team doc). Admins can set Group A/B on each team under <strong>Admin → Teams</strong>.
          </div>
        </Card>
      )}

      {!bucketsLoading && buckets.length === 0 && !loadError && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>No registered teams yet</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 4 }}>
            Once teams appear in Admin → Teams, their categories will show here with the same counts.
          </div>
        </Card>
      )}

      {!teamsLoading && teams.length === 0 && activeCategoryId && !loadError && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>No teams in this category</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 4, lineHeight: 1.45 }}>
            If Admin → Teams shows teams that should be here, their registration <code>category</code> label
            likely doesn&apos;t match. Open the team in Admin → Teams and assign the correct tournament category.
          </div>
        </Card>
      )}

      {[...grouped.entries()].map(([group, list]) => (
        <div key={group || "all"} style={{ marginBottom: 24 }}>
          {group ? (
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              GROUP {group}
            </div>
          ) : list.length > 0 ? (
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              TEAMS ({list.length})
            </div>
          ) : null}
          {list.length > 0 && (() => {
            const showPath = !isFestival && !hasGroups && !!activeCategory;
            return (
              <div className="standings-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, overflow: "hidden", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.color.border}` }}>
                      <th style={th("center")}>#</th>
                      <th style={{ ...th("left"), width: "100%", whiteSpace: "normal" }}>TEAM</th>
                      {!isFestival && (
                        <>
                          <th style={th("center")}>PL</th>
                          <th style={th("center")}>W</th>
                          <th style={th("center")}>D</th>
                          <th style={th("center")}>L</th>
                          <th style={th("right")}>GF</th>
                          <th style={th("right")}>GA</th>
                          <th style={th("right")}>GD</th>
                          <th style={th("right")}>PTS</th>
                        </>
                      )}
                      {showPath && <th style={{ ...th("left"), ...pathDivider }}>PATH TO SUNDAY</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((t, i) => {
                      const dest = showPath ? seedDestination(activeCategory!.bracketTemplate, t.stats.groupRank ?? i + 1) : null;
                      // Only tint when the outcome is actually known — a fixed Cup/Shield/Classic
                      // bracket, or genuine elimination. A seed still alive but headed to a Semi-
                      // Final/Quarter-Final/Wild Card whose winner isn't decided yet stays
                      // untinted rather than guessing at a color that isn't true yet.
                      const pathColor = dest?.bracket ? BRACKET_COLORS[dest.bracket] : dest?.eliminated ? ELIMINATED_COLOR : undefined;
                      const played = t.stats.wins + t.stats.draws + t.stats.losses;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => navigate(`/team/${t.id}`)}
                          style={{ cursor: "pointer", borderBottom: i < list.length - 1 ? `1px solid #F4F2F8` : undefined, background: pathColor?.bg }}
                        >
                          <td style={{ ...td("center"), fontWeight: 700 }}>{t.stats.groupRank ?? i + 1}</td>
                          <td style={{ ...td("left"), whiteSpace: "normal", fontWeight: 600 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {user && (
                                <span
                                  onClick={(e) => { e.stopPropagation(); toggleFollow(t.id); }}
                                  title={followed.has(t.id) ? "Unfollow this team" : "Follow this team"}
                                  style={{ cursor: "pointer", fontSize: 15, color: followed.has(t.id) ? theme.color.gold : theme.color.textMuted, lineHeight: 1 }}
                                >
                                  {followed.has(t.id) ? "★" : "☆"}
                                </span>
                              )}
                              {t.name}
                            </span>
                          </td>
                          {!isFestival && (
                            <>
                              <td style={td("center")}>{played}</td>
                              <td style={td("center")}>{t.stats.wins}</td>
                              <td style={td("center")}>{t.stats.draws}</td>
                              <td style={td("center")}>{t.stats.losses}</td>
                              <td style={td("right")}>{t.stats.goalsFor}</td>
                              <td style={td("right")}>{t.stats.goalsAgainst}</td>
                              <td style={td("right")}>{t.stats.goalDiff >= 0 ? "+" : ""}{t.stats.goalDiff}</td>
                              <td style={{ ...td("right"), fontWeight: 800 }}>{t.stats.points}</td>
                            </>
                          )}
                          {showPath && dest && (
                            <td style={{ ...td("left"), ...pathDivider }}>
                              <span
                                style={
                                  pathColor
                                    ? {
                                        fontSize: 11,
                                        fontWeight: 800,
                                        letterSpacing: 0.3,
                                        textTransform: "uppercase",
                                        color: pathColor.fg,
                                        background: pathColor.bg,
                                        padding: "4px 9px",
                                        borderRadius: 999,
                                        whiteSpace: "nowrap",
                                      }
                                    : { fontSize: 12.5, color: theme.color.textMuted }
                                }
                              >
                                {dest.eliminated ? "Eliminated" : dest.label}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      ))}

      {!isFestival && activeBucket?.matched && (
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>ROAD TO THE FINAL</div>

          {formatDescription && (
            <div style={{ background: theme.color.bg, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                <strong>Format:</strong> {formatDescription.format}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 6 }}>
                <strong>Road to the Final:</strong> {formatDescription.roadToFinal}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bracketGames.map((g) => {
              const home = teamById.get(g.homeTeamId);
              const away = teamById.get(g.awayTeamId);
              const homeLabel = home?.name ?? provisionalSideLabel(g.homeDrawPos, g.homeRef) ?? "TBD";
              const awayLabel = away?.name ?? provisionalSideLabel(g.awayDrawPos, g.awayRef) ?? "TBD";
              const bracketColor = g.bracket ? BRACKET_COLORS[g.bracket] : { fg: theme.color.textMuted, bg: theme.color.bg };
              return (
                <div
                  key={g.id}
                  onClick={() => navigate(`/game/${g.id}`)}
                  style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: bracketColor.fg, background: bracketColor.bg, padding: "4px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {g.bracket ? `${BRACKET_LABELS[g.bracket]} ` : ""}{ROUND_LABELS[g.round]}
                  </span>
                  <span style={{ flex: 1, minWidth: 160, fontWeight: 600 }}>
                    {home ? homeLabel : <em style={{ color: theme.color.textMuted, fontStyle: "italic", fontWeight: 500 }}>{homeLabel}</em>} vs{" "}
                    {away ? awayLabel : <em style={{ color: theme.color.textMuted, fontStyle: "italic", fontWeight: 500 }}>{awayLabel}</em>}
                  </span>
                  <span style={{ fontSize: 12.5, color: theme.color.textMuted, whiteSpace: "nowrap" }}>
                    {g.field} · {g.day.toUpperCase()}, {TOURNAMENT_DAY_DATES[g.day]} · {formatKickoffTime(g.kickoffTime)}
                  </span>
                </div>
              );
            })}
            {bracketGames.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Bracket games are seeded once group play wraps up.</div>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <SponsorStrip sponsors={sponsors} />
      </div>
    </div>
  );
}
