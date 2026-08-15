import { useState } from "react";
import { formatKickoffTime, TOURNAMENT_DAY_DATES } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useGame, useGameScorers, useTeam } from "../hooks/useData";
import { callItFinal, reopenGameCard } from "../lib/callables";
import { Modal, PrimaryButton } from "./ui";

/**
 * The one place a commissioner actually decides a game card: the
 * photographed card the referee submitted, side by side with the digital
 * record (score, goal scorers, cards, gate-check clearances, MOTM) that same
 * referee entered into the match console — so a discrepancy is something you
 * can actually SEE, not something you have to remember to go check
 * elsewhere. Read-only once the game is final; the reviewer's decision
 * (Call it final / send back) only shows while a card is genuinely awaiting
 * review.
 *
 * Subscribes to the game live (useGame), not a snapshot passed in as a prop
 * — calling it final flips gameCard.status right under this same modal, so
 * the footer swaps to the finalized note without needing to close/reopen.
 */
export function GameCardReviewModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
  const { data: scorers } = useGameScorers(gameId);
  const [busy, setBusy] = useState<"final" | "reopen" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!game || !home || !away) return null;
  const status = game.gameCard?.status ?? "not_submitted";

  const nameFor = (playerId: string) => {
    const p = [...home.roster, ...away.roster].find((r) => (r.playerKey ?? r.userId) === playerId);
    return p?.displayName ?? "Unknown player";
  };
  const homeGoals = (scorers?.scorers ?? []).filter((s) => s.teamId === game.homeTeamId).sort((a, b) => a.minute - b.minute);
  const awayGoals = (scorers?.scorers ?? []).filter((s) => s.teamId === game.awayTeamId).sort((a, b) => a.minute - b.minute);
  const allGoals = [...homeGoals, ...awayGoals].sort((a, b) => a.minute - b.minute);
  const cards = (game.events ?? []).filter((e) => e.type === "yellow_card" || e.type === "red_card").sort((a, b) => a.minute - b.minute);
  const motmPlayer = game.motmUserId ? [...home.roster, ...away.roster].find((p) => (p.playerKey ?? p.userId) === game.motmUserId) : undefined;
  const homeClearedCount = game.gateCheck?.homeClearedUids?.length ?? 0;
  const awayClearedCount = game.gateCheck?.awayClearedUids?.length ?? 0;

  async function finalize() {
    setBusy("final");
    setError(null);
    try {
      await callItFinal({ gameId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't call this game final.");
    } finally {
      setBusy(null);
    }
  }

  async function sendBack() {
    if (!window.confirm("Send this card back to the referee? They'll be able to edit the score, cards, and MOTM again.")) return;
    setBusy("reopen");
    setError(null);
    try {
      await reopenGameCard({ gameId });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send this card back.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal onClose={onClose} width={820}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>
            {home.name} vs {away.name}
          </div>
          <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 2 }}>
            {game.field} · {game.day.toUpperCase()} {TOURNAMENT_DAY_DATES[game.day]} · {formatKickoffTime(game.kickoffTime)}
            {game.gameCard?.submittedAt && ` · submitted ${new Date(game.gameCard.submittedAt).toLocaleString()}`}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: theme.color.bg, color: theme.color.textMuted, border: "none", width: 30, height: 30, borderRadius: "50%", fontSize: 15, cursor: "pointer", flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {game.forfeit ? (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 14, marginTop: 16, fontSize: 13.5, fontWeight: 600 }}>
          ⚑ Forfeited — {game.forfeit.outcome.replace(/_/g, " ")}. {game.forfeit.reason}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }} className="game-card-review-panes">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: theme.color.textMuted, marginBottom: 8 }}>
              Photographed card
            </div>
            {game.gameCard?.photoUrl ? (
              <img
                src={game.gameCard.photoUrl}
                alt="Submitted game card"
                style={{ width: "100%", borderRadius: theme.radius.md, border: `1px solid ${theme.color.border}`, display: "block" }}
              />
            ) : (
              <div style={{ border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, background: theme.color.bg, aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", color: theme.color.textMuted, fontSize: 13 }}>
                No photo submitted yet.
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: theme.color.textMuted, marginBottom: 8 }}>
              Digital record — cross-check against the photo
            </div>
            <div style={{ border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, background: theme.color.bg, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{home.name} vs {away.name}</div>
                <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{game.homeScore ?? 0}–{game.awayScore ?? 0}</div>
              </div>

              <DigiSection title="Goals">
                {allGoals.length === 0 ? (
                  <EmptyRow text="None logged" />
                ) : (
                  allGoals.map((g) => (
                    <EventRow key={g.id} text={`⚽ #${g.playerNumber} ${nameFor(g.playerId)}`} sub={g.teamId === game.homeTeamId ? home.name : away.name} minute={g.minute} />
                  ))
                )}
              </DigiSection>

              <DigiSection title="Cards">
                {cards.length === 0 ? (
                  <EmptyRow text="None issued" />
                ) : (
                  cards.map((e) => (
                    <EventRow
                      key={e.id}
                      dot={e.type === "yellow_card" ? theme.color.gold : theme.color.danger}
                      text={`#${e.playerNumber} ${nameFor(e.playerId)}`}
                      sub={e.teamId === game.homeTeamId ? home.name : away.name}
                      minute={e.minute}
                    />
                  ))
                )}
              </DigiSection>

              <DigiSection title="Gate check & MOTM">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <StatBox num={`${homeClearedCount}/${home.roster.length}`} label={`${home.name} cleared`} />
                  <StatBox num={`${awayClearedCount}/${away.roster.length}`} label={`${away.name} cleared`} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.color.border}` }}>
                  <span>🏅 Player of the Game</span>
                  <span style={{ fontWeight: 700 }}>{motmPlayer?.displayName ?? "—"}</span>
                </div>
              </DigiSection>
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ color: theme.color.danger, fontSize: 13, marginTop: 14 }}>{error}</div>}

      <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {status === "awaiting_commissioner" ? (
          <>
            <PrimaryButton onClick={finalize} disabled={busy !== null}>{busy === "final" ? "…" : "✓ Call it final"}</PrimaryButton>
            <button
              onClick={sendBack}
              disabled={busy !== null}
              style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "11px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", color: theme.color.text }}
            >
              {busy === "reopen" ? "…" : "Send back to referee"}
            </button>
          </>
        ) : status === "final" ? (
          <div style={{ background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: "10px 14px", fontSize: 12.5, fontWeight: 700, flex: 1 }}>
            ✓ Finalized{game.gameCard?.calledFinalAt ? ` — ${new Date(game.gameCard.calledFinalAt).toLocaleString()}` : ""}
          </div>
        ) : (
          <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No card submitted yet.</div>
        )}
      </div>
    </Modal>
  );
}

function DigiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function EventRow({ text, sub, minute, dot }: { text: string; sub: string; minute: number; dot?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", borderBottom: `1px solid ${theme.color.border}` }}>
      <span>
        {dot && <span style={{ display: "inline-block", width: 9, height: 12, borderRadius: 2, marginRight: 6, verticalAlign: -1, background: dot }} />}
        {text} <span style={{ color: theme.color.textMuted, fontSize: 11 }}>{sub}</span>
      </span>
      <span>{minute}'</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, color: theme.color.textMuted, padding: "4px 0" }}>{text}</div>;
}

function StatBox({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{num}</div>
      <div style={{ fontSize: 10.5, color: theme.color.textMuted }}>{label}</div>
    </div>
  );
}
