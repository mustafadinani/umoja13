import { useState, type ReactNode } from "react";
import type { RegisteredPlayer } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { sendUserMessage } from "../../../lib/callables";
import { Modal } from "../../../components/ui";

/**
 * Lightweight profile view for a registered player who hasn't submitted a
 * check-in yet — PlayerDocumentsModal (the Check-ins tab's own detail modal,
 * reused directly by PlayersAdminTab for anyone who HAS checked in) needs a
 * real CheckIn doc to show anything; this covers everyone else, so every
 * row in the Players tab is tappable regardless of check-in status.
 */
export function PlayerProfileModal({
  player,
  teamName,
  categoryLabel,
  jerseyNumber,
  onClose,
}: {
  player: RegisteredPlayer;
  teamName?: string;
  categoryLabel?: string;
  jerseyNumber?: number;
  onClose: () => void;
}) {
  const displayName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() || "Unnamed player";
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const canMessage = !!player.uid?.trim();

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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        {player.profilePicture ? (
          <img src={player.profilePicture} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div
            style={{
              width: 48, height: 48, borderRadius: "50%", background: theme.color.purple, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0,
            }}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>{displayName}</div>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>
            {[teamName, categoryLabel].filter(Boolean).join(" · ") || "No team or category on file"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, marginBottom: 16 }}>
        <InfoChip>Pending check-in</InfoChip>
        {jerseyNumber !== undefined && <InfoChip>Jersey #{jerseyNumber}</InfoChip>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, marginBottom: 16 }}>
        <Row label="Email" value={player.email || "—"} />
        <Row label="Phone" value={player.phone || "—"} />
        <Row label="Registration status" value={player.status || "—"} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        {player.email && (
          <a
            href={`mailto:${player.email}`}
            style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.navy, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "6px 12px", textDecoration: "none" }}
          >
            ✉ Email
          </a>
        )}
        <button
          disabled={!canMessage}
          title={canMessage ? undefined : "This player has never signed into the app, so there's no account to message."}
          onClick={() => { setMessageOpen((o) => !o); setMessageSent(false); setMessageError(null); }}
          style={{
            fontSize: 12.5, fontWeight: 700, color: canMessage ? theme.color.navy : theme.color.textMuted,
            background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm,
            padding: "6px 12px", cursor: canMessage ? "pointer" : "default", opacity: canMessage ? 1 : 0.6,
          }}
        >
          💬 Message
        </button>
        {messageSent && <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.success }}>✓ Sent</span>}
      </div>

      {messageOpen && canMessage && (
        <div>
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
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: theme.color.textMuted }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function InfoChip({ children }: { children: ReactNode }) {
  return (
    <span style={{ background: "#F1EFF5", color: theme.color.text, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
