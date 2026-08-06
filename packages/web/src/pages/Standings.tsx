import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FESTIVAL_CATEGORY_IDS, type Team } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGames, useSponsors, useTeams } from "../hooks/useData";
import { useRegistrationCategoryBuckets } from "../hooks/useRegistration";
import { Pill, Card } from "../components/ui";
import { SponsorStrip } from "../components/SponsorStrip";

const ROUND_LABELS: Record<string, string> = {
  qf: "QUARTERFINAL",
  sf_ab: "SEMIFINAL · A/B",
  sf_cd: "SEMIFINAL · C/D",
  final: "FINAL",
};

export function Standings() {
  const navigate = useNavigate();
  const { buckets, loading: bucketsLoading, error: bucketsError } = useRegistrationCategoryBuckets();
  const [categoryId, setCategoryId] = useState<string | null>(null);

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

  const bracketGames = games.filter((g) => g.categoryId === activeCategoryId && g.round !== "group");
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
          {list.length > 0 && (
            <div className="standings-scroll">
              <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isFestival ? "auto 1fr" : "auto 1fr auto auto auto auto",
                    gap: 10,
                    padding: "10px 14px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: theme.color.textMuted,
                    borderBottom: `1px solid ${theme.color.border}`,
                  }}
                >
                  <span>#</span>
                  <span>TEAM</span>
                  {!isFestival && (
                    <>
                      <span>PTS</span>
                      <span>GD</span>
                      <span>GF</span>
                      <span>W-D-L</span>
                    </>
                  )}
                </div>
                {list.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/team/${t.id}`)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isFestival ? "auto 1fr" : "auto 1fr auto auto auto auto",
                      gap: 10,
                      padding: "12px 14px",
                      fontSize: 14,
                      cursor: "pointer",
                      borderBottom: i < list.length - 1 ? `1px solid #F4F2F8` : undefined,
                      background: !isFestival && i < 2 ? "#FBF8FF" : undefined,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{t.stats.groupRank ?? i + 1}</span>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    {!isFestival && (
                      <>
                        <span style={{ fontWeight: 800 }}>{t.stats.points}</span>
                        <span>{t.stats.goalDiff >= 0 ? "+" : ""}{t.stats.goalDiff}</span>
                        <span>{t.stats.goalsFor}</span>
                        <span>{t.stats.wins}-{t.stats.draws}-{t.stats.losses}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {!isFestival && activeBucket?.matched && (
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>ROAD TO SUNDAY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bracketGames.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/game/${g.id}`)}
                style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.color.textMuted }}>{ROUND_LABELS[g.round] ?? g.round.toUpperCase()}</span>
                <span style={{ fontWeight: 600 }}>{g.field} · {g.kickoffTime}</span>
              </div>
            ))}
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
