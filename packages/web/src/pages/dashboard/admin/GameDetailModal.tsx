import { useState } from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, formatKickoffTime, type Game, type GameStatus } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useReferees, useTeam } from "../../../hooks/useData";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";
import { GameCardPhotoModal } from "../../../components/GameCardPhotoModal";

const ROUND_LABEL: Record<Game["round"], string> = {
  group: "Group stage", wildcard: "Wild card", qf: "Quarter-final", sf: "Semi-final", final: "Final",
};
const BRACKET_LABEL: Record<NonNullable<Game["bracket"]>, string> = { cup: "Cup", shield: "Shield", classic: "Classic" };

export function GameDetailModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const { data: home } = useTeam(game.homeTeamId);
  const { data: away } = useTeam(game.awayTeamId);
  const { data: referees } = useReferees();
  const [cardPhotoOpen, setCardPhotoOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const category = CATEGORIES.find((c) => c.id === game.categoryId);
  const homeGoals = game.homeScore ?? 0;
  const awayGoals = game.awayScore ?? 0;
  const roster = [...(home?.roster ?? []), ...(away?.roster ?? [])];
  const playerByKey = new Map(roster.map((p) => [p.playerKey ?? p.userId, p]));
  const motmPlayer = game.motmUserId ? playerByKey.get(game.motmUserId) : undefined;

  async function setStatus(status: GameStatus) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { status, updatedAt: Date.now() });
  }

  // Same direct write the referee console makes (firestore.rules already lets
  // staff — admin/commissioner — update any game field; only the referee's
  // own branch of that rule is field-restricted), so admin gets the same
  // score-adjustment power without a new backend path.
  async function adjustScore(side: "home" | "away", delta: number) {
    const field = side === "home" ? "homeScore" : "awayScore";
    const current = side === "home" ? homeGoals : awayGoals;
    const next = Math.max(0, current + delta);
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { [field]: next, updatedAt: Date.now() });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTIONS.games, game.id));
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  // Some games (finals, higher-stakes matches) run with two referees rather
  // than one, so this toggles membership in the list instead of picking a
  // single assignee.
  async function toggleRef(uid: string) {
    const current = game.refereeUids ?? [];
    const next = current.includes(uid) ? current.filter((u) => u !== uid) : [...current, uid];
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { refereeUids: next, updatedAt: Date.now() });
  }

  async function shift(minutes: number) {
    const [h, m] = game.kickoffTime.split(":").map(Number);
    const total = h * 60 + m + minutes;
    const nh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
    const nm = ((total % 60) + 60) % 60;
    await updateDoc(doc(db, COLLECTIONS.games, game.id), {
      kickoffTime: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
      updatedAt: Date.now(),
    });
  }

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 4 }}>
        {category?.label} · {game.field} · {game.day.toUpperCase()} {formatKickoffTime(game.kickoffTime)}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        {ROUND_LABEL[game.round]}
        {game.bracket ? ` · ${BRACKET_LABEL[game.bracket]}` : ""}
        {game.matchCode ? ` · ${game.matchCode}` : ""}
        {!home && game.homeDrawPos != null && ` · awaiting draw (Team ${game.homeDrawPos} v Team ${game.awayDrawPos})`}
        {!home && game.homeRef && ` · awaiting results`}
      </div>

      <div style={{ background: theme.color.navy, color: "#fff", borderRadius: theme.radius.md, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <ScoreStepper label={home?.name ?? "Home"} value={homeGoals} onAdjust={(d) => adjustScore("home", d)} />
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28, opacity: 0.6 }}>–</div>
          <ScoreStepper label={away?.name ?? "Away"} value={awayGoals} onAdjust={(d) => adjustScore("away", d)} />
        </div>
        {game.gameCard?.status && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10, textAlign: "center" }}>Game card: {game.gameCard.status.replace("_", " ")}</div>}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Player game cards</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        {game.events.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No cards issued.</div>}
        {game.events.map((e) => {
          const player = playerByKey.get(e.playerId);
          return (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 10px", background: theme.color.bg, borderRadius: 6, border: `1px solid ${theme.color.border}`, flexWrap: "wrap", gap: 6 }}>
              <span>{e.type === "red_card" ? "🟥" : "🟨"} {e.minute}' #{e.playerNumber} {player?.displayName ?? ""}</span>
            </div>
          );
        })}
        {motmPlayer && (
          <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 4 }}>⭐ Man of the match: {motmPlayer.displayName}</div>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Status</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["scheduled", "live", "final"] as GameStatus[]).map((s) => (
          <Pill key={s} active={game.status === s} onClick={() => setStatus(s)}>{s.toUpperCase()}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        Referees{(game.refereeUids?.length ?? 0) > 1 ? ` (${game.refereeUids?.length})` : ""}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 11.5, marginBottom: 8 }}>Tap to toggle — pick more than one for a double-ref game.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {referees.map((r) => <Pill key={r.uid} active={(game.refereeUids ?? []).includes(r.uid)} onClick={() => toggleRef(r.uid)}>{r.displayName}</Pill>)}
        {referees.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No referees yet.</div>}
        {referees.length > 0 && (game.refereeUids ?? []).length === 0 && <div style={{ color: theme.color.warning, fontSize: 12, fontWeight: 700, width: "100%" }}>No referee assigned yet.</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => shift(20)} style={{ flex: 1, background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "10px", fontWeight: 600, fontSize: 13 }}>Shift +20 min</button>
        {game.gameCard?.photoUrl && (
          <PrimaryButton onClick={() => setCardPhotoOpen(true)} style={{ flex: 1 }}>View card photo</PrimaryButton>
        )}
      </div>

      {confirmingDelete ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 13, color: theme.color.danger }}>Delete this game? This can't be undone.</div>
          <button onClick={() => setConfirmingDelete(false)} disabled={deleting} style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting} style={{ background: theme.color.danger, color: "#fff", border: "none", borderRadius: theme.radius.sm, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmingDelete(true)} style={{ background: "none", border: "none", color: theme.color.danger, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}>Delete game</button>
      )}

      {cardPhotoOpen && game.gameCard?.photoUrl && <GameCardPhotoModal url={game.gameCard.photoUrl} onClose={() => setCardPhotoOpen(false)} />}
    </Modal>
  );
}

/** Same stepper as the referee console's match console, so admin gets identical score-adjustment UX. */
function ScoreStepper({ label, value, onAdjust }: { label: string; value: number; onAdjust: (delta: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 90 }}>
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, textAlign: "center" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => onAdjust(-1)}
          disabled={value <= 0}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,.4)", background: "none", color: "#fff", fontSize: 16, fontWeight: 800, opacity: value <= 0 ? 0.35 : 1 }}
        >
          −
        </button>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, width: 36, textAlign: "center" }}>{value}</div>
        <button
          onClick={() => onAdjust(1)}
          style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,.4)", background: "none", color: "#fff", fontSize: 16, fontWeight: 800 }}
        >
          +
        </button>
      </div>
    </div>
  );
}
