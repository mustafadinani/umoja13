import { useMemo, useState } from "react";
import {
  FEEDBACK_ROLES,
  FEEDBACK_ROLE_LABELS,
  FEEDBACK_RATING_CATEGORIES,
  FEEDBACK_RATING_CATEGORY_LABELS,
  FEEDBACK_RATING_VALUES,
  FEEDBACK_RATING_VALUE_LABELS,
  FEEDBACK_RATING_SCORE,
  FEEDBACK_HELP_OPTION_LABELS,
  type FeedbackResponse,
  type FeedbackRatingValue,
} from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useFeedbackResponses } from "../../../hooks/useData";
import { Card } from "../../../components/ui";

const RATING_COLOR: Record<FeedbackRatingValue, string> = {
  excellent: theme.color.success,
  good: theme.color.blue,
  neutral: theme.color.textMuted,
  needs_improvement: theme.color.gold,
  didnt_like_it: theme.color.pink,
};

/** A tappable subset of responses — clicking the KPI/bar/pill that produced it filters the list below to exactly this. */
type Filter = { key: string; label: string; test: (r: FeedbackResponse) => boolean };

function Kpi({ num, label, active, onClick }: { num: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#F1EFF5" : theme.color.bg,
        border: `1.5px solid ${active ? theme.color.purple : theme.color.border}`,
        borderRadius: theme.radius.md,
        padding: "14px 16px",
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
      }}
    >
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28 }}>{num}</div>
      <div style={{ fontSize: 11, color: theme.color.textMuted, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </button>
  );
}

/**
 * Staff-only results view for the public /feedback survey — mirrors the
 * design reviewed as an artifact: KPIs, a role breakdown, a stacked bar per
 * rated category, then the individual responses (quotes + who wants to help
 * and how, including a live "Donated $X" tag when DonateStep actually
 * closed the loop instead of just leaving a lead).
 *
 * Every KPI tile, role pill, and rating-bar segment is clickable — it sets
 * `filter` and the responses list below narrows to just that subset, same
 * data either way (nothing here is fetched separately, it's a client-side
 * filter over what useFeedbackResponses already loaded).
 */
export function FeedbackAdminTab() {
  const { data: responses } = useFeedbackResponses();
  const [filter, setFilter] = useState<Filter | null>(null);

  const totalResponses = responses.length;

  const avgOverall = useMemo(() => {
    const scored = responses.map((r) => r.ratings.overall).filter((v): v is FeedbackRatingValue => !!v);
    if (scored.length === 0) return null;
    return scored.reduce((sum, v) => sum + FEEDBACK_RATING_SCORE[v], 0) / scored.length;
  }, [responses]);

  const helpingCount = responses.filter((r) => r.helpOptions.length > 0 || r.donatedOrderId).length;
  const donations = responses.filter((r) => r.donatedOrderId);
  const donatedTotalCents = donations.reduce((sum, r) => sum + (r.donatedAmountCents ?? 0), 0);

  const roleCounts = useMemo(() => {
    const counts = new Map(FEEDBACK_ROLES.map((r) => [r, 0]));
    for (const r of responses) {
      for (const role of r.roles) counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    return counts;
  }, [responses]);

  const ratingBreakdown = useMemo(() => {
    return FEEDBACK_RATING_CATEGORIES.map((cat) => {
      const counts = new Map(FEEDBACK_RATING_VALUES.map((v) => [v, 0]));
      let total = 0;
      for (const r of responses) {
        const v = r.ratings[cat];
        if (!v) continue;
        counts.set(v, (counts.get(v) ?? 0) + 1);
        total++;
      }
      return { cat, counts, total };
    });
  }, [responses]);

  function toggleFilter(next: Filter) {
    setFilter((prev) => (prev?.key === next.key ? null : next));
  }

  const filtered = filter ? responses.filter(filter.test) : responses;
  const isActive = (key: string) => filter?.key === key;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 26 }}>
        <Kpi
          num={String(totalResponses)}
          label="Responses"
          active={filter === null}
          onClick={() => setFilter(null)}
        />
        <Kpi
          num={avgOverall != null ? `${avgOverall.toFixed(1)}/5` : "—"}
          label="Avg. overall"
          active={isActive("overall-positive")}
          onClick={() =>
            toggleFilter({
              key: "overall-positive",
              label: "Rated overall Excellent or Good",
              test: (r) => r.ratings.overall === "excellent" || r.ratings.overall === "good",
            })
          }
        />
        <Kpi
          num={String(helpingCount)}
          label="Said they can help"
          active={isActive("helping")}
          onClick={() =>
            toggleFilter({
              key: "helping",
              label: "Said they can help",
              test: (r) => r.helpOptions.length > 0 || !!r.donatedOrderId,
            })
          }
        />
        <Kpi
          num={`$${(donatedTotalCents / 100).toLocaleString()}`}
          label={`Donated (${donations.length})`}
          active={isActive("donated")}
          onClick={() => toggleFilter({ key: "donated", label: "Donated", test: (r) => !!r.donatedOrderId })}
        />
      </div>

      {totalResponses === 0 ? (
        <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No responses yet.</div>
      ) : (
        <>
          <div style={{ fontFamily: theme.font.display, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>Who responded</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
            {FEEDBACK_ROLES.map((r) => {
              const key = `role-${r}`;
              const active = isActive(key);
              return (
                <button
                  key={r}
                  onClick={() => toggleFilter({ key, label: FEEDBACK_ROLE_LABELS[r], test: (resp) => resp.roles.includes(r) })}
                  style={{
                    fontSize: 12.5, fontWeight: 700, padding: "7px 13px", borderRadius: 999, cursor: "pointer",
                    background: active ? theme.color.purple : "#F1EFF5", color: active ? "#fff" : theme.color.purple,
                    border: "none", font: "inherit",
                  }}
                >
                  {FEEDBACK_ROLE_LABELS[r]} <span style={{ fontVariantNumeric: "tabular-nums" }}>{roleCounts.get(r) ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontFamily: theme.font.display, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Ratings, at a glance</div>
          <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 12 }}>Click a segment to filter to that rating.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 10 }}>
            {ratingBreakdown.map(({ cat, counts, total }) => {
              const positivePct = total > 0 ? Math.round(((counts.get("excellent")! + counts.get("good")!) / total) * 100) : 0;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                    <span>{FEEDBACK_RATING_CATEGORY_LABELS[cat]}</span>
                    <span style={{ color: theme.color.textMuted, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {total > 0 ? `${positivePct}% Excellent/Good` : "No ratings yet"}
                    </span>
                  </div>
                  <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: theme.color.border }}>
                    {total > 0 &&
                      FEEDBACK_RATING_VALUES.map((v) => {
                        const pct = ((counts.get(v) ?? 0) / total) * 100;
                        if (pct === 0) return null;
                        const key = `rating-${cat}-${v}`;
                        const active = isActive(key);
                        return (
                          <button
                            key={v}
                            title={`${FEEDBACK_RATING_CATEGORY_LABELS[cat]}: ${FEEDBACK_RATING_VALUE_LABELS[v]} (${counts.get(v)})`}
                            onClick={() =>
                              toggleFilter({
                                key,
                                label: `${FEEDBACK_RATING_CATEGORY_LABELS[cat]} — ${FEEDBACK_RATING_VALUE_LABELS[v]}`,
                                test: (r) => r.ratings[cat] === v,
                              })
                            }
                            style={{
                              width: `${pct}%`,
                              background: RATING_COLOR[v],
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              outline: active ? `2px solid ${theme.color.text}` : "none",
                              outlineOffset: -2,
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: theme.color.textMuted, marginBottom: 20 }}>
            {FEEDBACK_RATING_VALUES.map((v) => (
              <span key={v} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: RATING_COLOR[v], display: "inline-block" }} />
                {FEEDBACK_RATING_VALUE_LABELS[v]}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 700, fontSize: 17 }}>
              Individual responses {filter && <span style={{ fontWeight: 600, fontSize: 13, color: theme.color.textMuted }}>({filtered.length} of {totalResponses})</span>}
            </div>
            {filter && (
              <button
                onClick={() => setFilter(null)}
                style={{
                  fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                  background: theme.color.navy, color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {filter.label} ✕
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No responses match this filter.</div>}
            {filtered.map((r) => (
              <Card key={r.id} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {r.roles.map((role) => (
                      <span key={role} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#F1EFF5", color: theme.color.purple }}>
                        {FEEDBACK_ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 11.5, color: theme.color.textMuted }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>

                {(r.loved || r.improve) && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
                    {r.loved && (
                      <div style={{ fontSize: 12.5, fontStyle: "italic", color: theme.color.textMuted }}>
                        <span style={{ fontWeight: 700, color: theme.color.text, fontStyle: "normal" }}>Loved: </span>"{r.loved}"
                      </div>
                    )}
                    {r.improve && (
                      <div style={{ fontSize: 12.5, fontStyle: "italic", color: theme.color.textMuted }}>
                        <span style={{ fontWeight: 700, color: theme.color.text, fontStyle: "normal" }}>Improve: </span>"{r.improve}"
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {r.donatedOrderId && (
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: theme.color.warningBg, color: "#8A5A0F" }}>
                        🎁 Donated ${((r.donatedAmountCents ?? 0) / 100).toLocaleString()}
                      </span>
                    )}
                    {r.helpOptions.map((h) => (
                      <span key={h} style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#F1EFF5", color: theme.color.purple }}>
                        {FEEDBACK_HELP_OPTION_LABELS[h]}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: theme.color.textMuted }}>
                    {r.name || r.email ? [r.name, r.email].filter(Boolean).join(" · ") : "Anonymous"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
