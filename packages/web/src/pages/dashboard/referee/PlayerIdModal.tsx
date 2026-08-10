import { checkInStatusLabel, type RosterEntry, type Category } from "@umoja/shared";
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
        <div style={{ fontFamily: theme.font.display, fontWeight: 900, fontSize: 44, color: theme.color.purple, lineHeight: 1 }}>
          #{player.jerseyNumber ?? "—"}
        </div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28, marginTop: 6 }}>{player.displayName}</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4 }}>
          {teamName} · {category?.label ?? ""}
        </div>

        {approved ? (
          <>
            <div
              style={{
                background: cleared ? theme.color.successBg : theme.color.warningBg,
                color: cleared ? theme.color.success : theme.color.warning,
                borderRadius: theme.radius.sm,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                marginTop: 16,
              }}
            >
              {cleared ? "VERIFIED · CLEARED BY REF ✓" : "VERIFIED · NOT CLEARED YET"}
            </div>
            <PrimaryButton
              style={{ marginTop: 16, width: "100%", background: cleared ? theme.color.success : theme.color.navy }}
              onClick={onToggleClear}
            >
              {cleared ? "CLEARED — TAP TO UNDO" : "PHOTO MATCHES — CLEAR PLAYER"}
            </PrimaryButton>
          </>
        ) : (
          <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "12px", fontSize: 13, fontWeight: 700, marginTop: 16 }}>
            NOT VERIFIED — {checkInStatusLabel(player.checkInStatus)}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 14, background: "none", border: "none", color: theme.color.textMuted, fontSize: 13 }}>Close</button>
      </div>
    </Modal>
  );
}
