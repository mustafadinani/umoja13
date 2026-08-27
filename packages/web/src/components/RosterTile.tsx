import type { ReactNode } from "react";
import { checkInStatusLabel, type RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { VerifiedBadge } from "./ui";

/**
 * One roster row, reused by the Team roster tab and the Game page's roster.
 *
 * The tile's background always reflects whichever status needs attention
 * most: red when Verified (the identity check-in) hasn't happened, yellow
 * when Verified but not yet Cleared by Ref (the referee hasn't confirmed
 * them for this specific game), clean once both are done.
 *
 * The ref-clearance check is inherently scoped to one game — pass
 * `rosterChecked` only from a game-scoped page (Game); leave it `undefined`
 * on the Team roster tab, where there's no single game to check it against,
 * and only Verified is shown.
 */
export function RosterTile({
  player,
  onClick,
  rosterChecked,
  suspended,
  trailing,
  jerseyLabel = `#${player.jerseyNumber ?? "—"}`,
  onJerseyClick,
  jerseyLocked,
}: {
  player: RosterEntry;
  onClick: () => void;
  rosterChecked?: boolean;
  /** From computePlayerSuspension — advisory only, highest-priority visual flag (outranks verified/cleared background), never blocks the tile's own onClick. */
  suspended?: boolean;
  /** Small trailing badges appended to the status line (MOTM star, card emoji, etc). */
  trailing?: ReactNode;
  jerseyLabel?: string;
  /** When set, the jersey number becomes its own click target (captain editing it) instead of just display text. */
  onJerseyClick?: () => void;
  jerseyLocked?: boolean;
}) {
  const verified = player.checkInStatus === "approved";
  const showRosterCheck = verified && rosterChecked !== undefined;
  const tileBg = suspended ? theme.color.dangerBg : !verified ? theme.color.dangerBg : showRosterCheck && !rosterChecked ? theme.color.warningBg : "#fff";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius.md,
        padding: "9px 12px",
        cursor: "pointer",
        background: tileBg,
      }}
    >
      <div style={{ position: "relative", width: 38, height: 38, flexShrink: 0 }}>
        {player.selfieUrl ? (
          <img src={player.selfieUrl} alt={player.displayName} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>{player.displayName.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        {verified && <VerifiedBadge size={15} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {player.displayName}{player.isCaptain ? " (C)" : ""}
          </span>
          {onJerseyClick ? (
            <span
              onClick={(e) => { e.stopPropagation(); if (!jerseyLocked) onJerseyClick(); }}
              style={{ marginLeft: "auto", fontWeight: 800, fontSize: 11.5, color: jerseyLocked ? theme.color.textMuted : theme.color.purple, cursor: jerseyLocked ? "default" : "pointer" }}
            >
              {jerseyLabel}{jerseyLocked ? " 🔒" : ""}
            </span>
          ) : (
            <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 11.5, color: theme.color.textMuted }}>{jerseyLabel}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          {suspended && (
            <>
              <StatusDot tone="danger" label="🚫 Suspended" />
              <span style={{ color: theme.color.border, fontSize: 11 }}>·</span>
            </>
          )}
          {verified ? (
            <>
              <StatusDot tone="ok" label="Verified" />
              {showRosterCheck && (
                <>
                  <span style={{ color: theme.color.border, fontSize: 11 }}>·</span>
                  <StatusDot tone={rosterChecked ? "ok" : "warn"} label={rosterChecked ? "Cleared to play" : "Ref check pending"} />
                </>
              )}
            </>
          ) : (
            <StatusDot tone="danger" label={checkInStatusLabel(player.checkInStatus)} />
          )}
          {trailing}
        </div>
      </div>
      <span style={{ color: theme.color.textMuted, fontSize: 15, flexShrink: 0 }}>›</span>
    </div>
  );
}

function StatusDot({ tone, label }: { tone: "ok" | "warn" | "danger"; label: string }) {
  const color = tone === "ok" ? theme.color.success : tone === "warn" ? theme.color.warning : theme.color.danger;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </span>
  );
}
