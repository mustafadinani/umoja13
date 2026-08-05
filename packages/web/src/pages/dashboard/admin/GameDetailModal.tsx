import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, type Game, type GameStatus } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useReferees, useTeam } from "../../../hooks/useData";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";
import { GameCardPhotoModal } from "../../../components/GameCardPhotoModal";

export function GameDetailModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const { data: home } = useTeam(game.homeTeamId);
  const { data: away } = useTeam(game.awayTeamId);
  const { data: referees } = useReferees();
  const [cardPhotoOpen, setCardPhotoOpen] = useState(false);
  const category = CATEGORIES.find((c) => c.id === game.categoryId);
  const homeGoals = game.homeScore ?? 0;
  const awayGoals = game.awayScore ?? 0;

  async function setStatus(status: GameStatus) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { status, updatedAt: Date.now() });
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
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>
        {category?.label} · {game.field} · {game.day.toUpperCase()} {game.kickoffTime}
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

      {cardPhotoOpen && game.gameCard?.photoUrl && <GameCardPhotoModal url={game.gameCard.photoUrl} onClose={() => setCardPhotoOpen(false)} />}
    </Modal>
  );
}
