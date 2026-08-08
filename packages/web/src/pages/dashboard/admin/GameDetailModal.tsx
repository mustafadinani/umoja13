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

  async function setStatus(status: GameStatus) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { status, updatedAt: Date.now() });
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

  async function assignRef(uid: string | null) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { refereeUid: uid, updatedAt: Date.now() });
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

      <div style={{ background: theme.color.navy, color: "#fff", borderRadius: theme.radius.md, padding: 16, textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32 }}>{homeGoals} – {awayGoals}</div>
        {game.gameCard?.status && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Game card: {game.gameCard.status.replace("_", " ")}</div>}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Status</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["scheduled", "live", "final"] as GameStatus[]).map((s) => (
          <Pill key={s} active={game.status === s} onClick={() => setStatus(s)}>{s.toUpperCase()}</Pill>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Referee</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!game.refereeUid} onClick={() => assignRef(null)}>Unassigned</Pill>
        {referees.map((r) => <Pill key={r.uid} active={game.refereeUid === r.uid} onClick={() => assignRef(r.uid)}>{r.displayName}</Pill>)}
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
