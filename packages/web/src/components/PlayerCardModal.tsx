import type { RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal } from "./ui";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: "✓ Cleared to play", color: theme.color.success, bg: theme.color.successBg },
  pending_review: { label: "Pending review", color: theme.color.warning, bg: theme.color.warningBg },
  admin_review: { label: "Under admin review", color: theme.color.warning, bg: theme.color.warningBg },
  rejected: { label: "Not cleared", color: theme.color.danger, bg: theme.color.dangerBg },
  not_started: { label: "Check-in not started", color: theme.color.textMuted, bg: theme.color.bg },
};

export function PlayerCardModal({ player, teamName, onClose }: { player: RosterEntry; teamName: string; onClose: () => void }) {
  const status = STATUS_LABEL[player.checkInStatus] ?? STATUS_LABEL.not_started;

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {player.selfieUrl ? (
          <img src={player.selfieUrl} alt={player.displayName} style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", marginBottom: 14 }} />
        ) : (
          <div style={{ width: 140, height: 140, borderRadius: "50%", background: theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 40 }}>{player.displayName.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, textAlign: "center" }}>
          {player.displayName}{player.isCaptain ? " (C)" : ""}
        </div>
        <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 4, marginBottom: 14 }}>
          {teamName} · #{player.jerseyNumber ?? "—"}
        </div>

        <div style={{ background: status.bg, color: status.color, fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 99, marginBottom: 14 }}>
          {status.label}
        </div>

        {(player.goals > 0 || player.assists > 0) && (
          <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{player.goals}</div>
              <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>Goals</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{player.assists}</div>
              <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>Assists</div>
            </div>
          </div>
        )}

        {player.badges && player.badges.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {player.badges.map((b) => (
              <div key={b} style={{ background: "#F7F0FF", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, color: theme.color.purple }}>
                🏅 {b}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
