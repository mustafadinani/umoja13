import { useState } from "react";
import {
  computePlayerGameStats,
  computePlayerSuspension,
  suspensionReasonLabel,
  type CheckIn,
  type RegisteredPlayer,
  type RosterCheckIn,
} from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useGames, useMoments } from "../../../hooks/useData";
import { sendUserMessage, setJerseyNumber, setSwagPickedUp } from "../../../lib/callables";
import { CheckInStatusPill, Modal, Pill, PrimaryButton, VerifiedBadge } from "../../../components/ui";
import { Lightbox } from "../../../components/Lightbox";
import { MomentUploadModal } from "../../../components/MomentUploadModal";

export interface PlayerProfileSibling {
  id: string;
  name: string;
  teamName?: string;
  categoryLabel?: string;
}

/**
 * The Players tab's default tap target — a real profile (photo, stats,
 * jersey, family, swag), not a check-in review form. Reuses the same
 * photo/stats/suspension/Moments layout PlayerCardModal already established
 * on Game Day, rather than inventing a fourth player-detail component.
 * Full identity review (selfie/ID comparison, decide buttons) is one tap
 * further in via `onOpenCheckInDocuments`, opening the existing
 * PlayerDocumentsModal on demand instead of being the default.
 */
export function PlayerProfileModal({
  player,
  playerKey,
  teamId,
  teamName,
  categoryId,
  categoryLabel,
  checkIn,
  rosterCheckIn,
  siblings,
  onOpenSibling,
  onOpenCheckInDocuments,
  onClose,
}: {
  player: RegisteredPlayer;
  playerKey: string;
  teamId?: string;
  teamName?: string;
  categoryId?: string;
  categoryLabel?: string;
  /** The real submitted check-in doc, if any — drives status, the review link, and (once approved) stats/Moments. */
  checkIn?: CheckIn;
  /** PII-free overlay carrying jerseyNumber/swagPickedUp — same doc Team/RosterPanel/Teams-tab already read. */
  rosterCheckIn?: RosterCheckIn;
  siblings: PlayerProfileSibling[];
  onOpenSibling: (playerId: string) => void;
  onOpenCheckInDocuments?: () => void;
  onClose: () => void;
}) {
  const displayName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
  const { data: moments } = useMoments();
  const { data: games } = useGames();
  const playerMoments = moments.filter((m) => m.playerTagUids?.includes(playerKey)).sort((a, b) => b.createdAt - a.createdAt);
  // Games/Moments only mean something once a player has actually checked in
  // and played — showing an all-zero stat row for someone who never took the
  // field is noise, not information.
  const showGameFacts = checkIn?.status === "approved" && !!teamId;
  const stats = showGameFacts ? computePlayerGameStats(games, teamId!, playerKey) : undefined;
  const suspension = showGameFacts ? computePlayerSuspension(games, teamId!, playerKey) : undefined;
  // Jersey editing and swag pickup both live on the same rosterCheckIns
  // overlay doc, keyed by team+category — neither is meaningful without one.
  const canEditRoster = !!teamId && !!categoryId;

  const [editingJersey, setEditingJersey] = useState(false);
  const [jerseyDraft, setJerseyDraft] = useState("");
  const [jerseySaving, setJerseySaving] = useState(false);
  const [jerseyError, setJerseyError] = useState<string | null>(null);

  const [swagSaving, setSwagSaving] = useState(false);
  const [swagError, setSwagError] = useState<string | null>(null);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const canMessage = !!player.uid?.trim();

  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(false);

  async function submitJersey() {
    if (!teamId || !categoryId) return;
    const num = Number(jerseyDraft);
    if (!jerseyDraft || Number.isNaN(num) || num < 0 || num > 999) {
      setJerseyError("Enter a valid number (0–999).");
      return;
    }
    setJerseySaving(true);
    setJerseyError(null);
    try {
      await setJerseyNumber({ teamId, playerKey, categoryId, jerseyNumber: num });
      setEditingJersey(false);
    } catch (e) {
      setJerseyError(e instanceof Error ? e.message : "Couldn't save that number.");
    } finally {
      setJerseySaving(false);
    }
  }

  async function toggleSwag() {
    if (!teamId || !categoryId) return;
    setSwagSaving(true);
    setSwagError(null);
    try {
      await setSwagPickedUp({ teamId, playerKey, categoryId, pickedUp: !rosterCheckIn?.swagPickedUp });
    } catch (e) {
      setSwagError(e instanceof Error ? e.message : "Couldn't update swag status.");
    } finally {
      setSwagSaving(false);
    }
  }

  async function sendMessage() {
    if (!messageText.trim() || !player.uid) return;
    setMessageSending(true);
    setMessageError(null);
    try {
      await sendUserMessage({ targetUid: player.uid.trim(), text: messageText.trim() });
      setMessageText("");
      setMessageOpen(false);
      setMessageSent(true);
    } catch (e) {
      setMessageError(e instanceof Error ? e.message : "Couldn't send that message.");
    } finally {
      setMessageSending(false);
    }
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", width: 108, height: 108, marginBottom: 12 }}>
          {player.profilePicture ? (
            <img src={player.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 30 }}>{displayName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          {checkIn?.status === "approved" && <VerifiedBadge size={30} />}
        </div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 21, textAlign: "center" }}>{displayName}</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 3, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          {[teamName, categoryLabel].filter(Boolean).join(" · ") || "No team or category on file"}
          {canEditRoster && !editingJersey && (
            <>
              <span>· #{rosterCheckIn?.jerseyNumber ?? "—"}</span>
              <button
                onClick={() => { setEditingJersey(true); setJerseyDraft(String(rosterCheckIn?.jerseyNumber ?? "")); setJerseyError(null); }}
                style={{ background: "none", border: `1px solid ${theme.color.purple}`, color: theme.color.purple, borderRadius: 6, padding: "2px 7px", fontSize: 10.5, fontWeight: 800, cursor: "pointer" }}
              >
                ✎ Edit
              </button>
            </>
          )}
        </div>

        {canEditRoster && editingJersey && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <input
              autoFocus
              inputMode="numeric"
              value={jerseyDraft}
              onChange={(e) => setJerseyDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              style={{ width: 54, padding: 6, borderRadius: 6, border: `1px solid ${theme.color.border}`, textAlign: "center" }}
            />
            <button
              disabled={jerseySaving}
              onClick={submitJersey}
              style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              {jerseySaving ? "Submitting…" : "Submit"}
            </button>
            <button onClick={() => { setEditingJersey(false); setJerseyError(null); }} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}
        {jerseyError && <div style={{ color: theme.color.danger, fontSize: 12, marginBottom: 10 }}>{jerseyError}</div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <CheckInStatusPill status={checkIn?.status} />
          {canEditRoster && (
            <Pill
              bg={rosterCheckIn?.swagPickedUp ? theme.color.successBg : "#F1EFF5"}
              fg={rosterCheckIn?.swagPickedUp ? theme.color.success : theme.color.textMuted}
              onClick={swagSaving ? undefined : toggleSwag}
            >
              {swagSaving ? "Updating…" : rosterCheckIn?.swagPickedUp ? "🎁 Swag picked up" : "Swag pickup pending"}
            </Pill>
          )}
          {suspension?.suspended && (
            <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>
              🚫 Suspended next game{suspension.reason ? ` · ${suspensionReasonLabel(suspension.reason)}` : ""}
            </Pill>
          )}
        </div>
        {swagError && <div style={{ color: theme.color.danger, fontSize: 12, marginTop: -8, marginBottom: 12 }}>{swagError}</div>}

        {showGameFacts && stats && (
          <div style={{ display: "flex", width: "100%", gap: 8, marginBottom: 14 }}>
            <StatBox icon="⚽" value={stats.gamesPlayed} label="Games" />
            <StatBox icon="🟨" value={stats.yellowCards} label="Yellow" />
            <StatBox icon="🟥" value={stats.redCards} label="Red" />
            <StatBox icon="★" value={stats.motmCount} label="MOTM" />
          </div>
        )}

        <div style={{ width: "100%", background: "#F7F6F3", borderRadius: theme.radius.sm, padding: "0 12px", marginBottom: 16 }}>
          <FactRow label="Email" value={player.email || "—"} />
          {checkIn?.lineOfWork ? (
            <FactRow label="Profession" value={checkIn.lineOfWork} borderTop />
          ) : (
            <FactRow label="Registration status" value={player.status || "—"} borderTop />
          )}
        </div>

        <div style={{ display: "flex", gap: 8, width: "100%", marginBottom: messageOpen ? 8 : 18 }}>
          {player.email ? (
            <a
              href={`mailto:${player.email}`}
              style={{ flex: 1, textAlign: "center", background: theme.color.navy, color: "#fff", borderRadius: theme.radius.sm, padding: "9px", fontSize: 12, fontWeight: 800, textDecoration: "none" }}
            >
              ✉ Email
            </a>
          ) : (
            <div style={{ flex: 1, textAlign: "center", background: "#F1EFF5", color: theme.color.textMuted, borderRadius: theme.radius.sm, padding: "9px", fontSize: 12, fontWeight: 800 }}>
              ✉ No email
            </div>
          )}
          <button
            disabled={!canMessage}
            title={canMessage ? undefined : "This player has never signed into the app, so there's no account to message."}
            onClick={() => { setMessageOpen((o) => !o); setMessageSent(false); setMessageError(null); }}
            style={{
              flex: 1, textAlign: "center", background: "none", border: `1px solid ${theme.color.border}`, color: canMessage ? theme.color.navy : theme.color.textMuted,
              borderRadius: theme.radius.sm, padding: "9px", fontSize: 12, fontWeight: 800, cursor: canMessage ? "pointer" : "default", opacity: canMessage ? 1 : 0.6,
            }}
          >
            💬 Message
          </button>
        </div>
        {messageSent && <div style={{ color: theme.color.success, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>✓ Sent</div>}

        {messageOpen && canMessage && (
          <div style={{ width: "100%", marginBottom: 18 }}>
            <textarea
              autoFocus
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Message this player through Ask Umoja / organizer chat…"
              rows={2}
              style={{ width: "100%", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, marginBottom: 6, resize: "none" }}
            />
            <button
              disabled={messageSending || !messageText.trim()}
              onClick={sendMessage}
              style={{
                background: theme.color.navy, color: "#fff", border: "none", borderRadius: theme.radius.sm,
                padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                opacity: messageSending || !messageText.trim() ? 0.6 : 1,
              }}
            >
              {messageSending ? "Sending…" : "Send"}
            </button>
            {messageError && <div style={{ color: theme.color.danger, fontSize: 12, marginTop: 6 }}>{messageError}</div>}
          </div>
        )}

        {siblings.length > 0 && (
          <div style={{ width: "100%", marginBottom: 18 }}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
              Family — same account
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {siblings.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onOpenSibling(s.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 10px", borderRadius: 8, background: "#F7F6F3", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12.5 }}>{s.name}</div>
                    <div style={{ color: theme.color.textMuted, fontSize: 11.5 }}>{[s.categoryLabel, s.teamName].filter(Boolean).join(" · ") || "No team or category on file"}</div>
                  </div>
                  <span style={{ color: theme.color.textMuted, fontSize: 14 }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showGameFacts && teamId && (
          <div style={{ width: "100%", marginBottom: checkIn ? 16 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 }}>Moments</div>
              {playerMoments.length > 0 && (
                <div onClick={() => setAddMomentOpen(true)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: theme.color.purple }}>
                  + Add
                </div>
              )}
            </div>
            {playerMoments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 10px", background: "#F7F6F3", borderRadius: theme.radius.sm }}>
                <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 10 }}>No moments tagged yet.</div>
                <PrimaryButton onClick={() => setAddMomentOpen(true)} style={{ fontSize: 12.5 }}>+ ADD A MOMENT</PrimaryButton>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {playerMoments.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => m.mediaType !== "embed" && setLightbox({ src: m.mediaUrl, mediaType: m.mediaType })}
                    style={{ borderRadius: 8, overflow: "hidden", cursor: m.mediaType === "embed" ? "default" : "pointer", border: `1px solid ${theme.color.border}` }}
                  >
                    {m.mediaType === "video" ? (
                      <video src={m.mediaUrl} style={{ width: "100%", height: 74, objectFit: "cover" }} />
                    ) : m.mediaType === "embed" ? (
                      <div style={{ width: "100%", height: 74, background: "#F1EFF5" }} />
                    ) : (
                      <img src={m.mediaUrl} style={{ width: "100%", height: 74, objectFit: "cover" }} alt={m.caption} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {checkIn && onOpenCheckInDocuments && (
          <div
            onClick={onOpenCheckInDocuments}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", background: "#F3E8FC", color: theme.color.purple, borderRadius: 10, padding: "12px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            <span>
              {checkIn.status === "approved" ? "✓ Verified by admin" : "Review needed"} · view check-in documents
            </span>
            <span style={{ fontSize: 15 }}>›</span>
          </div>
        )}
      </div>

      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
      {addMomentOpen && teamId && (
        <MomentUploadModal onClose={() => setAddMomentOpen(false)} initialTeamTagIds={[teamId]} initialPlayerTagUids={[playerKey]} />
      )}
    </Modal>
  );
}

function StatBox({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", background: "#F7F6F3", borderRadius: theme.radius.sm, padding: "10px 4px" }}>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: theme.color.textMuted, marginTop: 2, fontWeight: 700, textTransform: "uppercase" }}>{icon} {label}</div>
    </div>
  );
}

function FactRow({ label, value, borderTop }: { label: string; value: string; borderTop?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: borderTop ? `1px solid ${theme.color.border}` : "none", fontSize: 12.5 }}>
      <span style={{ color: theme.color.textMuted }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
