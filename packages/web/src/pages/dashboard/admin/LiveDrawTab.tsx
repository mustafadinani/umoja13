import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, where, writeBatch } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, FESTIVAL_CATEGORY_IDS, FIELDS, podForField, type Game, type Team } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useGames, usePods, useTeams } from "../../../hooks/useData";

// Festival categories don't track standings/brackets — nothing to draw or schedule.
const DRAW_CATEGORIES = CATEGORIES.filter((c) => !FESTIVAL_CATEGORY_IDS.includes(c.id));
const KICKOFF_TIMES = ["08:00", "09:00", "10:00", "10:40", "11:30", "12:20", "13:10", "14:00", "15:00", "16:00"];
const DAYS: { id: Game["day"]; label: string }[] = [
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
  { id: "sun", label: "Sunday" },
];
const ROLL_COLORS = [
  theme.color.purple, theme.color.blue, theme.color.teal, theme.color.pink,
  theme.color.orange, theme.color.tealLight, theme.color.purpleLight, theme.color.gold,
];

// A deliberately distinct dark "stage" look for the event-day draw tool — the
// rest of Admin is a plain light dashboard, but this is meant to be read off
// a projector while a room watches balls come out of a pot.
const INK = "#F4F2F8", DIM = "#7A7295", DIM2 = "#8B7FB8", LINE = "#362C52", INSET = "#2A2145";
const PANEL_BG = "linear-gradient(165deg,#1B1430 0%,#150F28 100%)", CARD_BG = "#1B1430";
const FAINT = "#4E4670", MUTED2 = "#6B6390";
const GOLD = theme.color.gold, NAVY = theme.color.navy;

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}
function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return ROLL_COLORS[Math.abs(hash) % ROLL_COLORS.length];
}

interface DrawState {
  order: string[]; // team ids, in the order they were drawn
  rolling: boolean;
  rollName: string;
  landed: string | null;
  seeded: boolean;
  chaining: boolean;
}
const emptyDraw = (): DrawState => ({ order: [], rolling: false, rollName: "", landed: null, seeded: true, chaining: false });

/**
 * Admin-only seeded live draw: pick a category, draw teams one at a time
 * (or all at once) out of pot 1 before pot 2, watch the round-robin schedule
 * fill in live, then publish real fixtures straight to the Games collection.
 * Draw progress is deliberately session-only (like the design mockup) —
 * this is a one-sitting, in-person event-day tool, not something meant to
 * be resumed days later.
 */
export function LiveDrawTab() {
  const [categoryId, setCategoryId] = useState(DRAW_CATEGORIES[0]?.id ?? "");
  const [draws, setDraws] = useState<Record<string, DrawState>>({});
  const [day, setDay] = useState<Game["day"] | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState<string | null>(null);

  const { data: teams } = useTeams(categoryId);
  const { data: pods } = usePods();
  const { data: existingGames } = useGames(categoryId ? [where("categoryId", "==", categoryId)] : []);

  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawsRef = useRef(draws);
  drawsRef.current = draws;
  const teamsRef = useRef(teams);
  teamsRef.current = teams;

  useEffect(() => () => stopTimers(), []);

  function stopTimers() {
    if (rollTimer.current) { clearInterval(rollTimer.current); rollTimer.current = null; }
    if (landTimer.current) { clearTimeout(landTimer.current); landTimer.current = null; }
    if (chainTimer.current) { clearTimeout(chainTimer.current); chainTimer.current = null; }
  }

  function updateDraw(catId: string, patch: Partial<DrawState> | ((d: DrawState) => Partial<DrawState>)) {
    setDraws((prev) => {
      const cur = prev[catId] ?? emptyDraw();
      const delta = typeof patch === "function" ? patch(cur) : patch;
      return { ...prev, [catId]: { ...cur, ...delta } };
    });
  }

  function remainingFor(catId: string) {
    const ord = drawsRef.current[catId]?.order ?? [];
    return teamsRef.current.filter((t) => !ord.includes(t.id));
  }
  function eligibleFor(catId: string) {
    const rem = remainingFor(catId);
    const seeded = drawsRef.current[catId]?.seeded ?? true;
    if (!seeded || rem.length === 0) return rem;
    const lowest = Math.min(...rem.map((t) => t.seed ?? 1));
    return rem.filter((t) => (t.seed ?? 1) === lowest);
  }

  function roll(catId: string, duration: number, onDone?: () => void) {
    if (drawsRef.current[catId]?.rolling) return;
    const elig0 = eligibleFor(catId);
    if (!elig0.length) return;
    updateDraw(catId, { rolling: true, landed: null, rollName: elig0[0].name });
    rollTimer.current = setInterval(() => {
      const elig = eligibleFor(catId);
      if (!elig.length) return;
      updateDraw(catId, { rollName: elig[Math.floor(Math.random() * elig.length)].name });
    }, 68);
    landTimer.current = setTimeout(() => {
      if (rollTimer.current) { clearInterval(rollTimer.current); rollTimer.current = null; }
      const elig = eligibleFor(catId);
      const won = elig[Math.floor(Math.random() * elig.length)];
      updateDraw(catId, (cur) => ({ rolling: false, landed: won.id, order: [...cur.order, won.id] }));
      onDone?.();
    }, duration);
  }

  function selectCategory(id: string) {
    stopTimers();
    updateDraw(categoryId, { rolling: false, chaining: false, landed: null });
    setCategoryId(id);
  }

  const drawNext = () => { updateDraw(categoryId, { chaining: false }); roll(categoryId, 1650); };

  const drawAll = () => {
    const catId = categoryId;
    if (drawsRef.current[catId]?.rolling || remainingFor(catId).length === 0) return;
    updateDraw(catId, { chaining: true });
    const step = () => {
      if (!drawsRef.current[catId]?.chaining) return;
      if (remainingFor(catId).length === 0) { updateDraw(catId, { chaining: false }); return; }
      roll(catId, 820, () => { chainTimer.current = setTimeout(step, 620); });
    };
    step();
  };

  const undo = () => {
    stopTimers();
    updateDraw(categoryId, (cur) => ({ order: cur.order.slice(0, -1), rolling: false, landed: null, chaining: false }));
  };

  const reset = () => {
    stopTimers();
    updateDraw(categoryId, { order: [], rolling: false, landed: null, chaining: false });
    setJustPublished((p) => (p === categoryId ? null : p));
  };

  const toggleSeeded = () => {
    if ((draws[categoryId]?.order ?? []).length) return;
    updateDraw(categoryId, (cur) => ({ seeded: !cur.seeded }));
  };

  const draw = draws[categoryId] ?? emptyDraw();
  const category = DRAW_CATEGORIES.find((c) => c.id === categoryId) ?? DRAW_CATEGORIES[0];
  const n = teams.length;
  const picks = draw.order.map((id) => teams.find((t) => t.id === id)).filter((t): t is Team => !!t);
  const remaining = teams.filter((t) => !draw.order.includes(t.id));
  const eligible = draw.seeded && remaining.length ? remaining.filter((t) => (t.seed ?? 1) === Math.min(...remaining.map((t) => t.seed ?? 1))) : remaining;
  const done = n > 0 && picks.length === n;
  const busy = draw.rolling || draw.chaining;
  const landedIdx = draw.landed ? picks.findIndex((t) => t.id === draw.landed) : -1;

  const slots: (Team | null)[] = Array.from({ length: n }, (_, i) => picks[i] ?? null);
  const fixtures = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    return pairs.map(([i, j], k) => ({
      time: KICKOFF_TIMES[k % KICKOFF_TIMES.length],
      field: FIELDS[k % FIELDS.length],
      home: slots[i], away: slots[j],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, draw.order.join(",")]);

  async function publish() {
    if (!done || !day || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const batch = writeBatch(db);
      for (const f of fixtures) {
        if (!f.home || !f.away) continue;
        const ref = doc(collection(db, COLLECTIONS.games));
        batch.set(ref, {
          categoryId,
          day,
          kickoffTime: f.time,
          field: f.field,
          podId: podForField(pods, f.field) ?? null,
          homeTeamId: f.home.id,
          awayTeamId: f.away.id,
          status: "scheduled",
          round: "group",
          refereeUid: null,
          gateCheck: { homeClearedUids: [], awayClearedUids: [] },
          events: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      await batch.commit();
      setJustPublished(categoryId);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Couldn't publish fixtures.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20 }}>
        {DRAW_CATEGORIES.map((c) => {
          const catDraw = draws[c.id];
          const catTeamCount = c.id === categoryId ? n : undefined;
          const filled = catDraw?.order.length ?? 0;
          const active = c.id === categoryId;
          return (
            <div
              key={c.id}
              onClick={() => selectCategory(c.id)}
              style={{
                padding: "8px 14px", borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                background: active ? GOLD : "rgba(255,255,255,.04)", color: active ? NAVY : "#B4ABD0",
                border: `1px solid ${active ? GOLD : LINE}`,
              }}
            >
              {c.label}
              {filled > 0 && catTeamCount !== undefined && (
                <span style={{ fontWeight: 800, color: filled === catTeamCount ? theme.color.teal : GOLD }}>
                  {"  "}{filled === catTeamCount ? "✓" : `${filled}/${catTeamCount}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }} className="live-draw-grid">
        <div style={{ background: PANEL_BG, border: `1px solid ${LINE}`, borderRadius: 20, padding: 26, position: "relative", overflow: "hidden", color: INK }}>
          <div style={{ position: "absolute", top: -90, right: -90, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,47,209,.28),transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", position: "relative" }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.6, color: DIM, whiteSpace: "nowrap" }}>NOW DRAWING</div>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 29, marginTop: 2, whiteSpace: "nowrap" }}>{category?.label}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 29, color: GOLD }}>
                {picks.length}<span style={{ color: FAINT }}>/{n}</span>
              </div>
              <div style={{ fontSize: 11.5, color: DIM, whiteSpace: "nowrap" }}>positions filled</div>
            </div>
          </div>

          <div style={{ height: 5, borderRadius: 999, background: INSET, margin: "16px 0 22px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: n ? `${Math.round((picks.length / n) * 100)}%` : "0%", background: `linear-gradient(90deg,${theme.color.purple},${GOLD})`, borderRadius: 999, transition: "width .45s cubic-bezier(.2,.8,.3,1)" }} />
          </div>

          <div style={{
            borderRadius: 18, border: `1px solid ${draw.rolling ? "rgba(253,181,40,.4)" : INSET}`, background: draw.rolling ? "rgba(253,181,40,.05)" : "rgba(255,255,255,.02)",
            minHeight: 236, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 26, textAlign: "center", position: "relative", transition: "border-color .3s,background .3s",
          }}>
            {n === 0 && <div style={{ color: DIM, fontSize: 13.5 }}>No teams registered in this category yet.</div>}

            {n > 0 && !draw.rolling && !draw.landed && !done && (
              <>
                <div style={{ width: 70, height: 70, borderRadius: "50%", border: `2px dashed ${FAINT}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 27 }}>⚽</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 23, color: "#B4ABD0" }}>Ready to draw POSITION {picks.length + 1}</div>
                <div style={{ fontSize: 13.5, color: DIM, marginTop: 5 }}>
                  {draw.seeded && eligible.length < remaining.length
                    ? `${eligible.length} teams in pot ${eligible[0]?.seed ?? 1} · ${remaining.length} left overall`
                    : `${remaining.length} teams still in the pot`}
                </div>
              </>
            )}

            {draw.rolling && (
              <>
                <div style={{ width: 70, height: 70, borderRadius: "50%", border: "3px solid #FDB528", borderTopColor: "transparent", marginBottom: 16, animation: "liveDrawBallSpin .7s linear infinite" }} />
                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.6, color: GOLD }}>POSITION {picks.length + 1}</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 36, marginTop: 6, color: INK, opacity: 0.62, minHeight: 44 }}>{draw.rollName}</div>
              </>
            )}

            {!draw.rolling && !!draw.landed && !done && (
              <div style={{ animation: "liveDrawLand .42s cubic-bezier(.2,.9,.3,1.2)" }}>
                {(() => {
                  const wonTeam = picks[landedIdx];
                  if (!wonTeam) return null;
                  return (
                    <>
                      <div style={{ width: 74, height: 74, borderRadius: "50%", background: colorFor(wonTeam.name), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px", fontFamily: theme.font.display, fontWeight: 800, fontSize: 25, color: "#fff" }}>{initials(wonTeam.name)}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.6, color: GOLD }}>POSITION {landedIdx + 1}</div>
                      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 40, marginTop: 4 }}>{wonTeam.name}</div>
                      <div style={{ fontSize: 13, color: DIM, marginTop: 5 }}>Pot {wonTeam.seed ?? 1} · drawn into slot {landedIdx + 1}</div>
                    </>
                  );
                })()}
              </div>
            )}

            {!draw.rolling && done && (
              <div style={{ animation: "liveDrawLand .42s cubic-bezier(.2,.9,.3,1.2)" }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>🏆</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 31, color: GOLD }}>Draw complete</div>
                <div style={{ fontSize: 13.5, color: "#B4ABD0", marginTop: 5, maxWidth: 340 }}>Every position in {category?.label} is filled. Pick a day and publish to push the fixtures to the schedule.</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <div
              onClick={busy || done || n === 0 ? undefined : drawNext}
              style={{ flex: 1.5, textAlign: "center", padding: 15, borderRadius: 13, fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, letterSpacing: 1.2, cursor: busy || done ? "default" : "pointer", background: busy || done ? INSET : GOLD, color: busy || done ? MUTED2 : NAVY, transition: "background .2s" }}
            >
              {busy ? "DRAWING…" : done ? "ALL DRAWN" : "DRAW NEXT TEAM"}
            </div>
            <div
              onClick={busy || done || n === 0 ? undefined : drawAll}
              style={{ flex: 1, textAlign: "center", padding: 15, borderRadius: 13, fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, letterSpacing: 1.2, cursor: busy || done ? "default" : "pointer", border: `1px solid ${busy || done ? INSET : "#5E5580"}`, color: busy || done ? FAINT : INK, background: "none" }}
            >
              DRAW ALL
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 9 }}>
            <div onClick={undo} style={{ flex: 1, textAlign: "center", padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 12.5, cursor: "pointer", border: `1px solid ${LINE}`, color: picks.length ? "#B4ABD0" : FAINT }}>Undo last pick</div>
            <div onClick={reset} style={{ flex: 1, textAlign: "center", padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 12.5, cursor: "pointer", border: `1px solid ${LINE}`, color: "#B4ABD0" }}>Reset this category</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: picks.length ? "default" : "pointer", padding: "7px 13px", borderRadius: 999, background: draw.seeded ? "rgba(253,181,40,.14)" : "rgba(255,255,255,.04)", border: `1px solid ${draw.seeded ? "rgba(253,181,40,.4)" : LINE}`, marginTop: 18, width: "fit-content" }} onClick={toggleSeeded}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: draw.seeded ? GOLD : FAINT }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: draw.seeded ? GOLD : "#8B83A8" }}>Seeded pots</span>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 11 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.6, color: DIM, whiteSpace: "nowrap" }}>THE POT</div>
              <div style={{ fontSize: 12, color: DIM, whiteSpace: "nowrap" }}>{remaining.length} left</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {teams.map((t) => {
                const taken = draw.order.includes(t.id);
                const inPot = !taken && eligible.some((e) => e.id === t.id);
                return (
                  <div key={t.id} style={{
                    padding: "8px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                    background: taken ? "rgba(255,255,255,.02)" : inPot ? "rgba(139,47,209,.18)" : "rgba(255,255,255,.04)",
                    color: taken ? FAINT : INK,
                    border: `1px solid ${taken ? "#241D3C" : inPot ? "rgba(196,132,232,.4)" : LINE}`,
                    opacity: taken ? 0.45 : 1,
                    animation: inPot && draw.rolling ? "liveDrawPotPulse .9s ease-in-out infinite" : "none",
                  }}>
                    {taken ? `${t.name}  ·  ${draw.order.indexOf(t.id) + 1}` : t.name}
                  </div>
                );
              })}
              {teams.length === 0 && <div style={{ color: DIM, fontSize: 12.5 }}>No teams to draw.</div>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 20, padding: 20, color: INK }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 13 }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, letterSpacing: 0.8, whiteSpace: "nowrap" }}>DRAW POSITIONS</div>
              <div style={{ fontSize: 11.5, color: DIM, whiteSpace: "nowrap" }}>fills as each ball comes out</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {slots.map((team, i) => {
                const isNew = !!team && team.id === draw.landed;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 11,
                    background: team ? "rgba(253,181,40,.09)" : "rgba(255,255,255,.025)",
                    border: `1px solid ${team ? "rgba(253,181,40,.28)" : INSET}`,
                    animation: isNew ? "liveDrawSlotFlash 1.1s ease-out" : "none",
                  }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: team ? GOLD : INSET, color: team ? NAVY : MUTED2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 13.5, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ fontSize: 14, fontWeight: team ? 700 : 500, color: team ? INK : "#6B6390", flex: 1 }}>{team?.name ?? `Team ${i + 1}`}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: DIM, whiteSpace: "nowrap" }}>{team ? "" : "awaiting draw"}</div>
                  </div>
                );
              })}
              {slots.length === 0 && <div style={{ color: DIM, fontSize: 13 }}>Nothing to draw for this category yet.</div>}
            </div>
          </div>

          <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 20, padding: 20, color: INK }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 13 }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, letterSpacing: 0.8, whiteSpace: "nowrap" }}>SCHEDULE</div>
              <div style={{ fontSize: 11.5, color: DIM, whiteSpace: "nowrap" }}>{fixtures.length} fixtures</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 320, overflowY: "auto" }}>
              {fixtures.map((f, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 26px 1fr 74px", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: f.home && f.away ? "rgba(15,174,158,.07)" : "rgba(255,255,255,.02)", border: `1px solid ${f.home && f.away ? "rgba(15,174,158,.22)" : INSET}` }}>
                  <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 13.5, color: DIM2 }}>{f.time}</div>
                  <div style={{ fontSize: 13.5, fontWeight: f.home ? 700 : 500, color: f.home ? INK : "#6B6390", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.home?.name ?? "Team " + (fixtures.indexOf(f) + 1)}</div>
                  <div style={{ fontSize: 11, color: "#5E5580", textAlign: "center" }}>v</div>
                  <div style={{ fontSize: 13.5, fontWeight: f.away ? 700 : 500, color: f.away ? INK : "#6B6390", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.away?.name ?? "Team ?"}</div>
                  <div style={{ fontSize: 11, color: DIM, textAlign: "right", whiteSpace: "nowrap" }}>{f.field}</div>
                </div>
              ))}
              {fixtures.length === 0 && <div style={{ color: DIM, fontSize: 13 }}>Draw at least 2 teams to see fixtures.</div>}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: DIM, marginBottom: 6 }}>DAY</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {DAYS.map((d) => (
                  <div key={d.id} onClick={() => setDay(d.id)} style={{ padding: "7px 13px", borderRadius: 999, fontWeight: 700, fontSize: 12.5, cursor: "pointer", background: day === d.id ? GOLD : "rgba(255,255,255,.04)", color: day === d.id ? NAVY : "#B4ABD0", border: `1px solid ${day === d.id ? GOLD : LINE}` }}>
                    {d.label}
                  </div>
                ))}
              </div>
            </div>

            {existingGames.length > 0 && justPublished !== categoryId && (
              <div style={{ fontSize: 12, color: GOLD, marginBottom: 10, lineHeight: 1.4 }}>
                {existingGames.length} game{existingGames.length === 1 ? "" : "s"} already exist for {category?.label} — publishing will add {fixtures.filter((f) => f.home && f.away).length} more alongside them.
              </div>
            )}
            {publishError && <div style={{ fontSize: 12, color: theme.color.danger, marginBottom: 10 }}>{publishError}</div>}

            <div
              onClick={done && day && !publishing ? publish : undefined}
              style={{
                padding: 13, borderRadius: 11, textAlign: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 15.5, letterSpacing: 1.2,
                cursor: done && day && !publishing ? "pointer" : "default", transition: "background .2s",
                background: justPublished === categoryId ? "rgba(15,174,158,.16)" : done && day ? theme.color.teal : INSET,
                color: justPublished === categoryId ? theme.color.teal : done && day ? "#062E2A" : MUTED2,
              }}
            >
              {publishing ? "PUBLISHING…" : justPublished === categoryId ? "PUBLISHED TO SCHEDULE ✓" : !done ? "COMPLETE THE DRAW FIRST" : !day ? "PICK A DAY FIRST" : "PUBLISH TO SCHEDULE"}
            </div>
          </div>

          <div style={{ background: CARD_BG, border: `1px solid ${LINE}`, borderRadius: 20, padding: 20, color: INK }}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, letterSpacing: 0.8, marginBottom: 12, whiteSpace: "nowrap" }}>DRAW LOG</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {picks.map((t, i) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 13 }}>
                  <span style={{ fontFamily: theme.font.display, fontWeight: 800, color: GOLD, minWidth: 52 }}>POS {i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{t.name}</span>
                </div>
              )).reverse()}
              {picks.length === 0 && <div style={{ fontSize: 13, color: DIM }}>Nothing drawn yet.</div>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes liveDrawLand { 0% { transform: scale(.72); opacity: 0 } 55% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes liveDrawSlotFlash { 0% { background: #FDB528; color: #211A33 } 100% { background: rgba(253,181,40,.09); color: #F4F2F8 } }
        @keyframes liveDrawPotPulse { 0%, 100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes liveDrawBallSpin { 0% { transform: rotate(0) } 100% { transform: rotate(360deg) } }
        @media (max-width: 860px) { .live-draw-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
