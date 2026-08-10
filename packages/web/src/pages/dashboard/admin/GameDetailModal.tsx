import { useState } from "react";
import { arrayUnion, deleteDoc, deleteField, doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, GAME_FIELDS, formatKickoffTime, type Game, type GameEvent, type GameStatus, type RosterEntry } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useAuth } from "../../../auth/AuthProvider";
import { useReferees, useTeam, useTeams } from "../../../hooks/useData";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";
import { GameCardPhotoModal } from "../../../components/GameCardPhotoModal";

const ROUND_LABEL: Record<Game["round"], string> = {
  group: "Group stage", wildcard: "Wild card", qf: "Quarter-final", sf: "Semi-final", final: "Final",
};
const BRACKET_LABEL: Record<NonNullable<Game["bracket"]>, string> = { cup: "Cup", shield: "Shield", classic: "Classic" };
const DAY_LABEL: Record<Game["day"], string> = { fri: "Friday", sat: "Saturday", sun: "Sunday" };

export function GameDetailModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const { user } = useAuth();
  const { data: home } = useTeam(game.homeTeamId);
  const { data: away } = useTeam(game.awayTeamId);
  const { data: referees } = useReferees();
  const { data: categoryTeams } = useTeams(game.categoryId);
  const [cardPhotoOpen, setCardPhotoOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [eventPicker, setEventPicker] = useState<GameEvent["type"] | null>(null);
  const category = CATEGORIES.find((c) => c.id === game.categoryId);
  const homeGoals = game.homeScore ?? 0;
  const awayGoals = game.awayScore ?? 0;
  const homeRoster = home?.roster ?? [];
  const awayRoster = away?.roster ?? [];
  const roster = [...homeRoster, ...awayRoster];
  const playerByKey = new Map(roster.map((p) => [p.playerKey ?? p.userId, p]));
  const motmPlayer = game.motmUserId ? playerByKey.get(game.motmUserId) : undefined;
  const redCardedUids = new Set(game.events.filter((e) => e.type === "red_card").map((e) => e.playerId));

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

  async function setDay(day: Game["day"]) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { day, updatedAt: Date.now() });
  }

  async function setKickoffTime(kickoffTime: string) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { kickoffTime, updatedAt: Date.now() });
  }

  async function setField(field: string) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { field, updatedAt: Date.now() });
  }

  // A manually-picked team wins outright: onGameWrite only ever resolves
  // homeRef/awayRef into a concrete id when homeTeamId/awayTeamId is still
  // "" (see triggers/onGameWrite.ts), so this can never get silently
  // overwritten later — but the ref is cleared anyway for the same reason
  // the resolver itself clears it once resolved: it's no longer meaningful.
  async function setTeam(side: "home" | "away", teamId: string) {
    const teamField = side === "home" ? "homeTeamId" : "awayTeamId";
    const refField = side === "home" ? "homeRef" : "awayRef";
    const hadRef = side === "home" ? !!game.homeRef : !!game.awayRef;
    await updateDoc(doc(db, COLLECTIONS.games, game.id), {
      [teamField]: teamId,
      ...(hadRef ? { [refField]: deleteField() } : {}),
      updatedAt: Date.now(),
    });
  }

  // Same write shape as the referee console's own logEvent — admin/commissioner
  // needing to add a missed card or correct a mistaken one is exactly the
  // "anything to do with the game" gap this modal used to leave uncovered.
  async function logEvent(player: RosterEntry, side: "home" | "away") {
    if (!eventPicker || !user) return;
    const teamId = side === "home" ? game.homeTeamId : game.awayTeamId;
    const playerKey = player.playerKey ?? player.userId;
    const event: GameEvent = {
      id: `${Date.now()}-${playerKey}`,
      type: eventPicker,
      teamId,
      playerId: playerKey,
      playerNumber: player.jerseyNumber ?? 0,
      minute: Math.min(90, 4 + game.events.length * 9),
      createdAt: Date.now(),
      createdBy: user.uid,
    };
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { events: arrayUnion(event), updatedAt: Date.now() });
    setEventPicker(null);
  }

  async function undoEvent(eventId: string) {
    const next = game.events.filter((e) => e.id !== eventId);
    await updateDoc(doc(db, COLLECTIONS.games, game.id), { events: next, updatedAt: Date.now() });
  }

  async function pickMotm(playerKey: string) {
    await updateDoc(doc(db, COLLECTIONS.games, game.id), {
      motmUserId: game.motmUserId === playerKey ? deleteField() : playerKey,
      updatedAt: Date.now(),
    });
  }

  return (
    <Modal onClose={onClose} width={560}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>{category?.label} · {game.field} · {game.day.toUpperCase()} {formatKickoffTime(game.kickoffTime)}</span>
        <button
          onClick={() => setEditingDetails((v) => !v)}
          style={{ background: "none", border: "none", color: theme.color.purple, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}
        >
          {editingDetails ? "Done editing" : "✎ Edit"}
        </button>
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        {ROUND_LABEL[game.round]}
        {game.bracket ? ` · ${BRACKET_LABEL[game.bracket]}` : ""}
        {game.matchCode ? ` · ${game.matchCode}` : ""}
        {!home && game.homeDrawPos != null && ` · awaiting draw (Team ${game.homeDrawPos} v Team ${game.awayDrawPos})`}
        {!home && game.homeRef && ` · awaiting results`}
      </div>

      {editingDetails && (
        <div style={{ background: theme.color.bg, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Day</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["fri", "sat", "sun"] as Game["day"][]).map((d) => (
              <Pill key={d} active={game.day === d} onClick={() => setDay(d)}>{DAY_LABEL[d]}</Pill>
            ))}
          </div>

          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Kickoff time</div>
          <input
            type="time"
            value={game.kickoffTime}
            onChange={(e) => e.target.value && setKickoffTime(e.target.value)}
            style={{ width: "100%", padding: 9, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 12, fontSize: 13.5 }}
          />

          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Field</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {GAME_FIELDS.map((f) => <Pill key={f} active={game.field === f} onClick={() => setField(f)}>{f}</Pill>)}
          </div>

          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Home team</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {categoryTeams.filter((t) => t.id !== game.awayTeamId).map((t) => (
              <Pill key={t.id} active={game.homeTeamId === t.id} onClick={() => setTeam("home", t.id)} bg={game.homeTeamId === t.id ? t.color : undefined}>{t.name}</Pill>
            ))}
            {categoryTeams.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No teams in this category yet.</div>}
          </div>

          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Away team</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {categoryTeams.filter((t) => t.id !== game.homeTeamId).map((t) => (
              <Pill key={t.id} active={game.awayTeamId === t.id} onClick={() => setTeam("away", t.id)} bg={game.awayTeamId === t.id ? t.color : undefined}>{t.name}</Pill>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: theme.color.navy, color: "#fff", borderRadius: theme.radius.md, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <ScoreStepper label={home?.name ?? "Home"} value={homeGoals} onAdjust={(d) => adjustScore("home", d)} />
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28, opacity: 0.6 }}>–</div>
          <ScoreStepper label={away?.name ?? "Away"} value={awayGoals} onAdjust={(d) => adjustScore("away", d)} />
        </div>
        {game.gameCard?.status && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10, textAlign: "center" }}>Game card: {game.gameCard.status.replace("_", " ")}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Player cards</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEventPicker("yellow_card")} style={cardBtnStyle}>🟨 Add yellow</button>
          <button onClick={() => setEventPicker("red_card")} style={cardBtnStyle}>🟥 Add red</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        {game.events.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No cards issued.</div>}
        {game.events.map((e) => {
          const player = playerByKey.get(e.playerId);
          return (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "7px 10px", background: theme.color.bg, borderRadius: 6, border: `1px solid ${theme.color.border}`, flexWrap: "wrap", gap: 6 }}>
              <span>{e.type === "red_card" ? "🟥" : "🟨"} {e.minute}' #{e.playerNumber} {player?.displayName ?? ""}</span>
              <button
                onClick={() => undoEvent(e.id)}
                title="Remove this card"
                style={{ width: 18, height: 18, borderRadius: "50%", background: theme.color.border, color: theme.color.textMuted, fontSize: 10, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Player of the Game</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {roster.map((p) => {
          const playerKey = p.playerKey ?? p.userId;
          return (
            <Pill key={playerKey} active={game.motmUserId === playerKey} onClick={() => pickMotm(playerKey)}>
              #{p.jerseyNumber ?? "—"} {p.displayName}
            </Pill>
          );
        })}
        {roster.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No roster to pick from yet.</div>}
        {motmPlayer && <div style={{ width: "100%", fontSize: 12.5, color: theme.color.textMuted, marginTop: 4 }}>⭐ Player of the Game: {motmPlayer.displayName}</div>}
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

      {game.gameCard?.photoUrl && (
        <PrimaryButton onClick={() => setCardPhotoOpen(true)} style={{ width: "100%", marginBottom: 16 }}>View card photo</PrimaryButton>
      )}

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
      {eventPicker && (
        <EventPlayerPicker
          type={eventPicker}
          homeName={home?.name ?? "Home"}
          awayName={away?.name ?? "Away"}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
          redCardedUids={redCardedUids}
          onPick={logEvent}
          onClose={() => setEventPicker(null)}
        />
      )}
    </Modal>
  );
}

const cardBtnStyle: React.CSSProperties = {
  background: "none",
  border: `1px solid ${theme.color.border}`,
  borderRadius: theme.radius.sm,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

/** Same combined-roster picker shape as the referee console's own card flow, so admin/commissioner get an identical add-card UX. */
function EventPlayerPicker({
  type,
  homeName,
  awayName,
  homeRoster,
  awayRoster,
  redCardedUids,
  onPick,
  onClose,
}: {
  type: GameEvent["type"];
  homeName: string;
  awayName: string;
  homeRoster: RosterEntry[];
  awayRoster: RosterEntry[];
  redCardedUids: Set<string>;
  onPick: (player: RosterEntry, side: "home" | "away") => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
        {type === "red_card" ? "🟥 Red card" : "🟨 Yellow card"} — pick a player
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {([["home", homeName, homeRoster], ["away", awayName, awayRoster]] as const).map(([side, name, list]) => (
          <div key={side}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.textMuted, marginBottom: 6 }}>{name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {list.map((p) => {
                const playerKey = p.playerKey ?? p.userId;
                const alreadyRed = redCardedUids.has(playerKey);
                return (
                  <button
                    key={playerKey}
                    disabled={alreadyRed}
                    onClick={() => onPick(p, side)}
                    style={{
                      textAlign: "left",
                      background: "none",
                      border: `1px solid ${theme.color.border}`,
                      borderRadius: theme.radius.sm,
                      padding: "8px 10px",
                      fontSize: 12.5,
                      cursor: alreadyRed ? "not-allowed" : "pointer",
                      opacity: alreadyRed ? 0.4 : 1,
                    }}
                  >
                    #{p.jerseyNumber ?? "—"} {p.displayName}
                  </button>
                );
              })}
              {list.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12 }}>No roster yet.</div>}
            </div>
          </div>
        ))}
      </div>
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
