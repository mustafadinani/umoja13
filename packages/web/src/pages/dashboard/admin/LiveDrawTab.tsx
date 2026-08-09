import { useEffect, useMemo, useRef, useState } from "react";
import { doc, setDoc, where, writeBatch } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, compareGamesByKickoff, fieldCluster, formatKickoffTime, podForField, type Game, type Team } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { Modal, PrimaryButton } from "../../../components/ui";
import { useDraw, useGames, usePods, useTeams } from "../../../hooks/useData";

const DRAW_CATEGORIES = CATEGORIES;
const ROLL_COLORS = [
  theme.color.purple, theme.color.blue, theme.color.teal, theme.color.pink,
  theme.color.orange, theme.color.tealLight, theme.color.purpleLight, theme.color.gold,
];
const DAY_LABEL: Record<Game["day"], string> = { fri: "Friday", sat: "Saturday", sun: "Sunday" };

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

interface RollState {
  rolling: boolean;
  rollName: string;
  landed: string | null;
  chaining: boolean;
}
const emptyRoll = (): RollState => ({ rolling: false, rollName: "", landed: null, chaining: false });

/**
 * Admin-only live draw: pick a division, draw its real registered teams one
 * at a time (or all at once) into 1-indexed draw positions, then publish —
 * which backfills homeTeamId/awayTeamId on that division's already-seeded
 * group-stage games (the full 226-game Aug 2026 schedule is pre-loaded with
 * each game's day/time/field and its `homeDrawPos`/`awayDrawPos`; the draw's
 * only job is deciding which real team sits at which position). Sunday's
 * playoff games resolve separately, automatically, off final group-stage
 * standings and results (see the onGameWrite bracket-resolution trigger) —
 * nothing to publish here for those.
 *
 * Draw order is persisted to Firestore (draws/{categoryId}) as each pick
 * lands, so — unlike the old CSV-shell tool — this is resumable across a
 * refresh or multiple sittings, not a one-shot in-person-only session.
 */
export function LiveDrawTab() {
  const [categoryId, setCategoryId] = useState(DRAW_CATEGORIES[0]?.id ?? "");
  const [rolls, setRolls] = useState<Record<string, RollState>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState<string | null>(null);

  const { data: teams } = useTeams(categoryId);
  const { data: pods } = usePods();
  const { data: draw } = useDraw(categoryId);
  const { data: categoryGames } = useGames(categoryId ? [where("categoryId", "==", categoryId)] : []);

  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const orderRef = useRef<string[]>(draw?.order ?? []);
  orderRef.current = draw?.order ?? [];
  const rollsRef = useRef(rolls);
  rollsRef.current = rolls;
  // Mutated synchronously (unlike rollsRef, which only reflects state as of
  // the last render) so drawAll's own step() loop can read the flag it just
  // set in the same tick, instead of racing React's batched re-render.
  const chainingRef = useRef<Record<string, boolean>>({});

  useEffect(() => () => stopTimers(), []);
  useEffect(() => { setJustPublished(null); setPublishError(null); }, [categoryId]);

  function stopTimers() {
    if (rollTimer.current) { clearInterval(rollTimer.current); rollTimer.current = null; }
    if (landTimer.current) { clearTimeout(landTimer.current); landTimer.current = null; }
    if (chainTimer.current) { clearTimeout(chainTimer.current); chainTimer.current = null; }
  }

  function updateRoll(catId: string, patch: Partial<RollState> | ((d: RollState) => Partial<RollState>)) {
    setRolls((prev) => {
      const cur = prev[catId] ?? emptyRoll();
      const delta = typeof patch === "function" ? patch(cur) : patch;
      return { ...prev, [catId]: { ...cur, ...delta } };
    });
  }

  async function persistOrder(catId: string, order: string[]) {
    await setDoc(doc(db, COLLECTIONS.draws, catId), { categoryId: catId, order, updatedAt: Date.now() }, { merge: true });
  }

  function remainingFor() {
    return teamsRef.current.filter((t) => !orderRef.current.includes(t.id));
  }

  function roll(catId: string, duration: number, onDone?: () => void) {
    if (rollsRef.current[catId]?.rolling) return;
    const pool0 = remainingFor();
    if (!pool0.length) return;
    updateRoll(catId, { rolling: true, landed: null, rollName: pool0[0].name });
    rollTimer.current = setInterval(() => {
      const pool = remainingFor();
      if (!pool.length) return;
      updateRoll(catId, { rollName: pool[Math.floor(Math.random() * pool.length)].name });
    }, 68);
    landTimer.current = setTimeout(() => {
      if (rollTimer.current) { clearInterval(rollTimer.current); rollTimer.current = null; }
      const pool = remainingFor();
      const won = pool[Math.floor(Math.random() * pool.length)];
      const nextOrder = [...orderRef.current, won.id];
      updateRoll(catId, { rolling: false, landed: won.id });
      persistOrder(catId, nextOrder);
      onDone?.();
    }, duration);
  }

  function selectCategory(id: string) {
    stopTimers();
    chainingRef.current[categoryId] = false;
    updateRoll(categoryId, { rolling: false, chaining: false, landed: null });
    setCategoryId(id);
  }

  const drawNext = () => { chainingRef.current[categoryId] = false; updateRoll(categoryId, { chaining: false }); roll(categoryId, 1650); };

  const drawAll = () => {
    const catId = categoryId;
    if (rollsRef.current[catId]?.rolling || remainingFor().length === 0) return;
    chainingRef.current[catId] = true;
    updateRoll(catId, { chaining: true });
    const step = () => {
      if (!chainingRef.current[catId]) return;
      if (remainingFor().length === 0) { chainingRef.current[catId] = false; updateRoll(catId, { chaining: false }); return; }
      roll(catId, 820, () => { chainTimer.current = setTimeout(step, 620); });
    };
    step();
  };

  const undo = () => {
    stopTimers();
    chainingRef.current[categoryId] = false;
    updateRoll(categoryId, { rolling: false, landed: null, chaining: false });
    persistOrder(categoryId, orderRef.current.slice(0, -1));
  };

  const reset = () => {
    stopTimers();
    chainingRef.current[categoryId] = false;
    updateRoll(categoryId, { rolling: false, landed: null, chaining: false });
    persistOrder(categoryId, []);
    setJustPublished((p) => (p === categoryId ? null : p));
  };

  const category = DRAW_CATEGORIES.find((c) => c.id === categoryId) ?? DRAW_CATEGORIES[0];
  const order = draw?.order ?? [];
  const n = teams.length;
  const picks = order.map((id) => teams.find((t) => t.id === id)).filter((t): t is Team => !!t);
  const remaining = teams.filter((t) => !order.includes(t.id));
  const done = n > 0 && picks.length === n;
  const rollState = rolls[categoryId] ?? emptyRoll();
  const busy = rollState.rolling || rollState.chaining;
  const landedIdx = rollState.landed ? picks.findIndex((t) => t.id === rollState.landed) : -1;
  const slots: (Team | null)[] = Array.from({ length: n }, (_, i) => picks[i] ?? null);

  const groupGames = useMemo(
    () => categoryGames.filter((g) => g.round === "group").sort(compareGamesByKickoff),
    [categoryGames]
  );
  const fixtures = useMemo(
    () => groupGames.map((g) => ({
      game: g,
      home: g.homeDrawPos != null ? slots[g.homeDrawPos - 1] ?? null : null,
      away: g.awayDrawPos != null ? slots[g.awayDrawPos - 1] ?? null : null,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupGames, order.join(",")]
  );
  const alreadyPublished = groupGames.length > 0 && groupGames.every((g) => !!g.homeTeamId && !!g.awayTeamId);
  const canPublish = done && groupGames.length > 0;

  async function confirmPublish() {
    if (!canPublish || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const batch = writeBatch(db);
      for (const g of groupGames) {
        if (g.homeDrawPos == null || g.awayDrawPos == null) continue;
        const home = order[g.homeDrawPos - 1];
        const away = order[g.awayDrawPos - 1];
        if (!home || !away) continue;
        batch.update(doc(db, COLLECTIONS.games, g.id), {
          homeTeamId: home,
          awayTeamId: away,
          podId: podForField(pods, fieldCluster(g.field)) ?? null,
          updatedAt: Date.now(),
        });
      }
      await batch.commit();
      await setDoc(doc(db, COLLECTIONS.draws, categoryId), { publishedAt: Date.now() }, { merge: true });
      setJustPublished(categoryId);
      setReviewOpen(false);
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
          const catTeamCount = c.id === categoryId ? n : undefined;
          const filled = c.id === categoryId ? picks.length : undefined;
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
              {!!filled && catTeamCount !== undefined && (
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

          {n > 0 && category && n !== category.teamCount && (
            <div style={{ marginTop: 10, fontSize: 12, color: theme.color.warning, lineHeight: 1.4 }}>
              Heads up — {category.label} has {n} registered team{n === 1 ? "" : "s"}, but the schedule expects {category.teamCount}. Fixtures referencing a missing position will show as TBD after publishing.
            </div>
          )}

          <div style={{ height: 5, borderRadius: 999, background: INSET, margin: "16px 0 22px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: n ? `${Math.round((picks.length / n) * 100)}%` : "0%", background: `linear-gradient(90deg,${theme.color.purple},${GOLD})`, borderRadius: 999, transition: "width .45s cubic-bezier(.2,.8,.3,1)" }} />
          </div>

          <div style={{
            borderRadius: 18, border: `1px solid ${rollState.rolling ? "rgba(253,181,40,.4)" : INSET}`, background: rollState.rolling ? "rgba(253,181,40,.05)" : "rgba(255,255,255,.02)",
            minHeight: 236, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 26, textAlign: "center", position: "relative", transition: "border-color .3s,background .3s",
          }}>
            {n === 0 && <div style={{ color: DIM, fontSize: 13.5 }}>No teams registered in this category yet.</div>}

            {n > 0 && !rollState.rolling && !rollState.landed && !done && (
              <>
                <div style={{ width: 70, height: 70, borderRadius: "50%", border: `2px dashed ${FAINT}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 27 }}>⚽</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 23, color: "#B4ABD0" }}>Ready to draw POSITION {picks.length + 1}</div>
                <div style={{ fontSize: 13.5, color: DIM, marginTop: 5 }}>{remaining.length} teams in the pot</div>
              </>
            )}

            {rollState.rolling && (
              <>
                <div style={{ width: 70, height: 70, borderRadius: "50%", border: "3px solid #FDB528", borderTopColor: "transparent", marginBottom: 16, animation: "liveDrawBallSpin .7s linear infinite" }} />
                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.6, color: GOLD }}>POSITION {picks.length + 1}</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 36, marginTop: 6, color: INK, opacity: 0.62, minHeight: 44 }}>{rollState.rollName}</div>
              </>
            )}

            {!rollState.rolling && !!rollState.landed && !done && (
              <div style={{ animation: "liveDrawLand .42s cubic-bezier(.2,.9,.3,1.2)" }}>
                {(() => {
                  const wonTeam = picks[landedIdx];
                  if (!wonTeam) return null;
                  return (
                    <>
                      <div style={{ width: 74, height: 74, borderRadius: "50%", background: colorFor(wonTeam.name), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px", fontFamily: theme.font.display, fontWeight: 800, fontSize: 25, color: "#fff" }}>{initials(wonTeam.name)}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.6, color: GOLD }}>POSITION {landedIdx + 1}</div>
                      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 40, marginTop: 4 }}>{wonTeam.name}</div>
                      <div style={{ fontSize: 13, color: DIM, marginTop: 5 }}>Drawn into slot {landedIdx + 1}</div>
                    </>
                  );
                })()}
              </div>
            )}

            {!rollState.rolling && done && (
              <div style={{ animation: "liveDrawLand .42s cubic-bezier(.2,.9,.3,1.2)" }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>🏆</div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 31, color: GOLD }}>Draw complete</div>
                <div style={{ fontSize: 13.5, color: "#B4ABD0", marginTop: 5, maxWidth: 340 }}>Every position in {category?.label} is filled. Review and publish on the right when you're ready.</div>
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

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 11 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.6, color: DIM, whiteSpace: "nowrap" }}>THE POT</div>
              <div style={{ fontSize: 12, color: DIM, whiteSpace: "nowrap" }}>{remaining.length} left</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {teams.map((t) => {
                const taken = order.includes(t.id);
                return (
                  <div key={t.id} style={{
                    padding: "8px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 700,
                    background: taken ? "rgba(255,255,255,.02)" : "rgba(139,47,209,.18)",
                    color: taken ? FAINT : INK,
                    border: `1px solid ${taken ? "#241D3C" : "rgba(196,132,232,.4)"}`,
                    opacity: taken ? 0.45 : 1,
                    animation: !taken && rollState.rolling ? "liveDrawPotPulse .9s ease-in-out infinite" : "none",
                  }}>
                    {taken ? `${t.name}  ·  ${order.indexOf(t.id) + 1}` : t.name}
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
                const isNew = !!team && team.id === rollState.landed;
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
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, letterSpacing: 0.8, whiteSpace: "nowrap" }}>GROUP-STAGE SCHEDULE</div>
              <div style={{ fontSize: 11.5, color: DIM, whiteSpace: "nowrap" }}>{fixtures.length} fixture{fixtures.length === 1 ? "" : "s"}</div>
            </div>

            {fixtures.length === 0 ? (
              <div style={{ color: DIM, fontSize: 13, marginBottom: 4 }}>No group-stage games seeded yet for {category?.label}.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 320, overflowY: "auto" }}>
                {fixtures.map((f) => (
                  <div key={f.game.id} style={{ display: "grid", gridTemplateColumns: "40px 52px 1fr 26px 1fr 74px", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: f.home && f.away ? "rgba(15,174,158,.07)" : "rgba(255,255,255,.02)", border: `1px solid ${f.home && f.away ? "rgba(15,174,158,.22)" : INSET}` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: DIM }}>{DAY_LABEL[f.game.day].slice(0, 3).toUpperCase()}</div>
                    <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 13.5, color: DIM2 }}>{formatKickoffTime(f.game.kickoffTime)}</div>
                    <div style={{ fontSize: 13.5, fontWeight: f.home ? 700 : 500, color: f.home ? INK : "#6B6390", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.home?.name ?? `Team ${f.game.homeDrawPos}`}</div>
                    <div style={{ fontSize: 11, color: "#5E5580", textAlign: "center" }}>v</div>
                    <div style={{ fontSize: 13.5, fontWeight: f.away ? 700 : 500, color: f.away ? INK : "#6B6390", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.away?.name ?? `Team ${f.game.awayDrawPos}`}</div>
                    <div style={{ fontSize: 11, color: DIM, textAlign: "right", whiteSpace: "nowrap" }}>{f.game.field}</div>
                  </div>
                ))}
              </div>
            )}

            {alreadyPublished && justPublished !== categoryId && (
              <div style={{ fontSize: 12, color: theme.color.teal, marginTop: 12, lineHeight: 1.4 }}>
                {category?.label}'s group games already show real teams — publishing again will overwrite them with this draw.
              </div>
            )}

            <div
              onClick={canPublish && justPublished !== categoryId ? () => setReviewOpen(true) : undefined}
              style={{
                marginTop: 14, padding: 13, borderRadius: 11, textAlign: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 15.5, letterSpacing: 1.2,
                cursor: canPublish && justPublished !== categoryId ? "pointer" : "default", transition: "background .2s",
                background: justPublished === categoryId ? "rgba(15,174,158,.16)" : canPublish ? theme.color.teal : INSET,
                color: justPublished === categoryId ? theme.color.teal : canPublish ? "#062E2A" : MUTED2,
              }}
            >
              {justPublished === categoryId ? "PUBLISHED TO SCHEDULE ✓" : !done ? "COMPLETE THE DRAW FIRST" : groupGames.length === 0 ? "NO GAMES SEEDED YET" : alreadyPublished ? "RE-PUBLISH TO SCHEDULE" : "REVIEW & PUBLISH"}
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

      {reviewOpen && (
        <Modal onClose={() => (publishing ? null : setReviewOpen(false))} width={560}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Review before publishing</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>
            {category?.label} · {fixtures.length} fixture{fixtures.length === 1 ? "" : "s"}
          </div>

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Draw positions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {slots.map((t, i) => (
              <div key={i} style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 999, background: theme.color.bg, border: `1px solid ${theme.color.border}` }}>
                <span style={{ fontWeight: 800, color: theme.color.purple }}>#{i + 1}</span> {t?.name ?? "—"}
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Fixtures</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, maxHeight: 280, overflowY: "auto" }}>
            {fixtures.map((f) => (
              <div key={f.game.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: theme.color.bg, fontSize: 13 }}>
                <span style={{ color: theme.color.textMuted, minWidth: 118 }}>{DAY_LABEL[f.game.day]} {formatKickoffTime(f.game.kickoffTime)} · {f.game.field}</span>
                <span style={{ fontWeight: 700, textAlign: "right", flex: 1 }}>{f.home?.name ?? "?"} v {f.away?.name ?? "?"}</span>
              </div>
            ))}
          </div>

          {alreadyPublished && (
            <div style={{ fontSize: 13, color: theme.color.warning, marginBottom: 12, lineHeight: 1.4 }}>
              Heads up — {category?.label}'s group games already have real teams assigned. Publishing will overwrite them with this draw.
            </div>
          )}
          {publishError && <div style={{ fontSize: 13, color: theme.color.danger, marginBottom: 12 }}>{publishError}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setReviewOpen(false)}
              disabled={publishing}
              style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "12px 16px", fontWeight: 700, cursor: publishing ? "default" : "pointer" }}
            >
              Cancel
            </button>
            <PrimaryButton disabled={publishing} onClick={confirmPublish} style={{ flex: 1 }}>
              {publishing ? "Publishing…" : `Confirm & publish ${fixtures.filter((f) => f.home && f.away).length} games`}
            </PrimaryButton>
          </div>
        </Modal>
      )}

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
