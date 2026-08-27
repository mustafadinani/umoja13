import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import {
  CATEGORIES,
  COLLECTIONS,
  formatKickoffTime,
  rosterCheckInIdFor,
  type Incident,
  type IncidentMessage,
  type RosterCheckIn,
} from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useDocument } from "../hooks/firestore";
import { useGame, useGames, useTeam } from "../hooks/useData";
import { Card, CheckInStatusPill, IncidentStatusPill, Modal, PrimaryButton, StatusBadge } from "./ui";
import { GameCardPhotoModal } from "./GameCardPhotoModal";
import { GameDetailModal } from "../pages/dashboard/admin/GameDetailModal";

export function IncidentReplyModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState<"resolved" | "denied" | null>(null);
  const [response, setResponse] = useState("");

  const open = incident.status !== "resolved" && incident.status !== "denied";

  async function startReview() {
    await updateDoc(doc(db, COLLECTIONS.incidents, incident.id), { status: "under_review", updatedAt: Date.now() });
  }

  async function send() {
    if (!draft.trim() || !user) return;
    setBusy(true);
    const message: IncidentMessage = {
      id: `${Date.now()}`,
      from: "commissioner",
      authorUid: user.uid,
      text: draft,
      createdAt: Date.now(),
    };
    await updateDoc(doc(db, COLLECTIONS.incidents, incident.id), {
      thread: arrayUnion(message),
      updatedAt: Date.now(),
    });
    setDraft("");
    setBusy(false);
  }

  // Resolving or denying always carries a response back to the filer — this
  // is the one action that closes the case, distinct from the free-form
  // thread messages above. The same text lands in both `resolution.response`
  // (a first-class field for "My Reports") and `thread` (so it also reads
  // in-context alongside the rest of the conversation).
  async function closeCase(decision: "resolved" | "denied") {
    if (!response.trim() || !user) return;
    setBusy(true);
    const message: IncidentMessage = {
      id: `${Date.now()}`,
      from: "commissioner",
      authorUid: user.uid,
      text: response.trim(),
      createdAt: Date.now(),
    };
    await updateDoc(doc(db, COLLECTIONS.incidents, incident.id), {
      status: decision,
      resolution: {
        resolvedBy: user.uid,
        resolvedByName: profile?.displayName ?? "Commissioner",
        resolvedAt: Date.now(),
        response: response.trim(),
      },
      thread: arrayUnion(message),
      updatedAt: Date.now(),
    });
    setBusy(false);
    setClosing(null);
    setResponse("");
  }

  return (
    <Modal onClose={onClose} width={520}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
        Case #{incident.caseNumber}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 12 }}>
        {incident.source.replace("_", " ")} · {incident.filedByName} ({incident.filedByRole})
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <IncidentStatusPill status={incident.status} />
        {incident.status === "submitted" && (
          <button type="button" onClick={() => void startReview()} style={smallLinkStyle}>
            Start review
          </button>
        )}
      </div>

      {incident.complaintType === "ineligible_player" && incident.playerKey && incident.playerTeamId && (
        <PlayerEligibilityPanel incident={incident} />
      )}
      {incident.complaintType === "game_related" && incident.gameId && <GameContextPanel gameId={incident.gameId} />}

      <div style={{ fontWeight: 700, fontSize: 11, color: theme.color.textMuted, marginBottom: 6, letterSpacing: 0.5 }}>
        THE COMPLAINT
      </div>
      <div style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12, fontSize: 13.5, marginBottom: 14 }}>
        {incident.text}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
        {incident.thread.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.from === "commissioner" ? "flex-end" : "flex-start",
              background: m.from === "commissioner" ? theme.color.purple : "#F1EFF5",
              color: m.from === "commissioner" ? "#fff" : theme.color.text,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              maxWidth: "85%",
            }}
          >
            {m.text}
          </div>
        ))}
        {incident.thread.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No messages yet.</div>}
      </div>

      {open && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Send a message…"
            style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
          />
          <PrimaryButton disabled={busy || !draft.trim()} onClick={send}>Send</PrimaryButton>
        </div>
      )}

      {open ? (
        <div style={{ borderTop: `1px solid ${theme.color.border}`, paddingTop: 14 }}>
          {closing ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {closing === "resolved" ? "Resolve this case" : "Deny this case"}
              </div>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write the response that will be sent back to the coach/captain to close this case…"
                rows={3}
                style={textareaStyle}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <PrimaryButton disabled={busy || !response.trim()} onClick={() => void closeCase(closing)}>
                  {busy ? "Sending…" : closing === "resolved" ? "CONFIRM RESOLVE" : "CONFIRM DENY"}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => {
                    setClosing(null);
                    setResponse("");
                  }}
                  style={smallLinkStyle}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <PrimaryButton onClick={() => setClosing("resolved")}>✅ RESOLVE</PrimaryButton>
              <button type="button" onClick={() => setClosing("denied")} style={denyBtnStyle}>
                ❌ DENY
              </button>
            </div>
          )}
        </div>
      ) : (
        incident.resolution && (
          <div style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: theme.color.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>
              {incident.status === "resolved" ? "RESOLVED" : "DENIED"} BY {incident.resolution.resolvedByName.toUpperCase()}
            </div>
            <div style={{ fontSize: 13.5 }}>{incident.resolution.response}</div>
          </div>
        )
      )}
    </Modal>
  );
}

/**
 * Everything a commissioner needs to decide a player-eligibility complaint
 * without leaving this modal: the two distinct verification facts (they are
 * NOT the same data — see checkin.ts) — the tournament check-in (identity,
 * once per player per category) and the referee's own per-game gate-check
 * clearance (attendance/roster verification, one fact per game).
 */
function PlayerEligibilityPanel({ incident }: { incident: Incident }) {
  const { data: rosterCheckIn } = useDocument<RosterCheckIn>(
    COLLECTIONS.rosterCheckIns,
    incident.playerTeamId && incident.playerKey && incident.playerCategoryId
      ? rosterCheckInIdFor(incident.playerTeamId, incident.playerKey, incident.playerCategoryId)
      : undefined
  );
  const { data: games } = useGames();
  const relevantGames = games.filter(
    (g) => g.homeTeamId === incident.playerTeamId || g.awayTeamId === incident.playerTeamId
  );

  return (
    <Card style={{ marginBottom: 14, background: "#FAFAF8" }}>
      <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, letterSpacing: 0.3 }}>🧑‍⚖️ PLAYER ELIGIBILITY CHECK</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        {incident.playerName}
        {incident.playerCategoryId && (
          <span style={{ fontWeight: 500, color: theme.color.textMuted, fontSize: 12.5 }}>
            {" "}
            · {CATEGORIES.find((c) => c.id === incident.playerCategoryId)?.label}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: theme.color.textMuted }}>Tournament check-in:</span>
        <CheckInStatusPill status={rosterCheckIn?.status} />
      </div>
      <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 6 }}>Referee roster/gate check, by game:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {relevantGames.map((g) => {
          const side = g.homeTeamId === incident.playerTeamId ? "home" : "away";
          const cleared = (
            (side === "home" ? g.gateCheck?.homeClearedUids : g.gateCheck?.awayClearedUids) ?? []
          ).includes(incident.playerKey ?? "");
          return (
            <div
              key={g.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                padding: "6px 10px",
                background: "#fff",
                borderRadius: 6,
                border: `1px solid ${theme.color.border}`,
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <span>
                {g.day.toUpperCase()} {formatKickoffTime(g.kickoffTime)} · {g.field}
              </span>
              <span style={{ fontWeight: 700, color: cleared ? theme.color.success : theme.color.warning }}>
                {cleared ? "Cleared by ref" : "Not cleared"}
              </span>
            </div>
          );
        })}
        {relevantGames.length === 0 && <div style={{ fontSize: 12, color: theme.color.textMuted }}>No games found for this team.</div>}
      </div>
    </Card>
  );
}

/** Game summary + one-click access to the full game admin (adjust score, cards, awards) — reuses GameDetailModal rather than building a second editing surface. */
function GameContextPanel({ gameId }: { gameId: string }) {
  const { data: game } = useGame(gameId);
  const { data: home } = useTeam(game?.homeTeamId);
  const { data: away } = useTeam(game?.awayTeamId);
  const [showDetail, setShowDetail] = useState(false);
  const [showCardPhoto, setShowCardPhoto] = useState(false);

  if (!game) {
    return (
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>Game not found.</div>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 14, background: "#FAFAF8" }}>
      <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, letterSpacing: 0.3 }}>🥅 GAME</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>
        {home?.name ?? "TBD"} {game.homeScore ?? 0}–{game.awayScore ?? 0} {away?.name ?? "TBD"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.color.textMuted, marginTop: 2, marginBottom: 10, flexWrap: "wrap" }}>
        {CATEGORIES.find((c) => c.id === game.categoryId)?.label} · {game.field} · {game.day.toUpperCase()} {formatKickoffTime(game.kickoffTime)}
        <StatusBadge status={game.status} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {game.gameCard?.photoUrl && (
          <button type="button" onClick={() => setShowCardPhoto(true)} style={outlineBtnStyle}>
            View game card photo
          </button>
        )}
        <button type="button" onClick={() => setShowDetail(true)} style={outlineBtnStyle}>
          Open game (adjust score/cards/awards) →
        </button>
      </div>
      {showDetail && <GameDetailModal game={game} onClose={() => setShowDetail(false)} />}
      {showCardPhoto && game.gameCard?.photoUrl && (
        <GameCardPhotoModal url={game.gameCard.photoUrl} onClose={() => setShowCardPhoto(false)} />
      )}
    </Card>
  );
}

const smallLinkStyle = {
  background: "none",
  border: "none",
  color: theme.color.blue,
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
} as const;

const outlineBtnStyle = {
  background: "#fff",
  border: `1px solid ${theme.color.border}`,
  borderRadius: theme.radius.sm,
  padding: "8px 12px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
} as const;

const denyBtnStyle = {
  background: "none",
  border: `1px solid ${theme.color.danger}`,
  color: theme.color.danger,
  borderRadius: theme.radius.sm,
  padding: "10px 16px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
} as const;

const textareaStyle = {
  width: "100%",
  padding: 10,
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.color.border}`,
  fontSize: 13.5,
  resize: "vertical" as const,
  marginBottom: 10,
  boxSizing: "border-box" as const,
};
