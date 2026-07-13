import type { RosterEntry, Category } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { Modal, PrimaryButton } from "../../../components/ui";

export function PlayerIdModal({
  player,
  teamName,
  category,
  cleared,
  onToggleClear,
  onClose,
}: {
  player: RosterEntry;
  teamName: string;
  category?: Category;
  cleared: boolean;
  onToggleClear: () => void;
  onClose: () => void;
}) {
  const approved = player.checkInStatus === "approved";

  return (
    <Modal onClose={onClose} width={360}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            margin: "0 auto 12px",
            background: player.selfieUrl ? `url(${player.selfieUrl}) center/cover` : theme.color.purple,
            border: approved ? `3px solid ${theme.color.gold}` : `3px solid ${theme.color.border}`,
          }}
        />
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20 }}>{player.displayName}</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4 }}>
          #{player.jerseyNumber ?? "—"} · {teamName} · {category?.label ?? ""}
        </div>

        {approved ? (
          <>
            <div style={{ background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: "8px 12px", fontSize: 13, fontWeight: 700, marginTop: 16 }}>
              Tournament Pass approved ✓
            </div>
            <PrimaryButton
              style={{ marginTop: 16, width: "100%", background: cleared ? theme.color.success : theme.color.navy }}
              onClick={onToggleClear}
            >
              {cleared ? "CLEARED — TAP TO UNDO" : "PHOTO MATCHES — CLEAR TO PLAY"}
            </PrimaryButton>
          </>
        ) : (
          <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "12px", fontSize: 13, fontWeight: 700, marginTop: 16 }}>
            NOT CLEARED — {player.checkInStatus === "not_started" ? "hasn't checked in" : "pending admin approval"}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 14, background: "none", border: "none", color: theme.color.textMuted, fontSize: 13 }}>Close</button>
      </div>
    </Modal>
  );
}
