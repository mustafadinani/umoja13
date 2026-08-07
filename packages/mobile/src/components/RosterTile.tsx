import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { checkInStatusLabel, type RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { LoadingImage } from "./LoadingImage";
import { VerifiedBadge } from "./ui";

/**
 * One roster row, reused by the Team roster tab and Game Day's roster.
 *
 * The tile's background always reflects whichever status needs attention
 * most: red when Verified (the identity check-in) hasn't happened, yellow
 * when Verified but not yet Roster Checked (the referee hasn't gate-cleared
 * them into this specific game), clean once both are done.
 *
 * Roster Check is inherently scoped to one game — pass `rosterChecked` only
 * from a game-scoped screen (Game Day); leave it `undefined` on the Team
 * tab, where there's no single game to check it against, and only Verified
 * is shown.
 */
export function RosterTile({
  player,
  onPress,
  rosterChecked,
  trailing,
  jerseyLabel = `#${player.jerseyNumber ?? "—"}`,
  onJerseyPress,
  jerseyLocked,
}: {
  player: RosterEntry;
  onPress: () => void;
  rosterChecked?: boolean;
  /** Small trailing badges appended to the status line (MOTM star, card emoji, etc). */
  trailing?: ReactNode;
  jerseyLabel?: string;
  /** When set, the jersey number becomes its own tap target (captain editing it) instead of just display text. */
  onJerseyPress?: () => void;
  jerseyLocked?: boolean;
}) {
  const verified = player.checkInStatus === "approved";
  const showRosterCheck = verified && rosterChecked !== undefined;
  const tileStyle = !verified ? styles.tileDanger : showRosterCheck && !rosterChecked ? styles.tileWarning : styles.tileOk;
  const jerseyText = (
    <Text style={[styles.jersey, onJerseyPress && !jerseyLocked && styles.jerseyEditable]}>
      {jerseyLabel}{jerseyLocked ? " 🔒" : ""}
    </Text>
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.tile, tileStyle]}>
      <View style={styles.avatarWrap}>
        {player.selfieUrl ? (
          <LoadingImage source={{ uri: player.selfieUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{player.displayName.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        {verified && <VerifiedBadge size={15} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {player.displayName}{player.isCaptain ? " (C)" : ""}
          </Text>
          {onJerseyPress ? (
            <TouchableOpacity onPress={onJerseyPress} disabled={jerseyLocked}>{jerseyText}</TouchableOpacity>
          ) : (
            jerseyText
          )}
        </View>
        <View style={styles.statusRow}>
          {verified ? (
            <>
              <StatusDot tone="ok" label="Verified" />
              {showRosterCheck && (
                <>
                  <Text style={styles.sep}>·</Text>
                  <StatusDot tone={rosterChecked ? "ok" : "warn"} label={rosterChecked ? "Roster Checked" : "Not Roster Checked"} />
                </>
              )}
            </>
          ) : (
            <StatusDot tone="danger" label={checkInStatusLabel(player.checkInStatus)} />
          )}
          {trailing}
        </View>
      </View>
      <Text style={styles.chev}>›</Text>
    </TouchableOpacity>
  );
}

function StatusDot({ tone, label }: { tone: "ok" | "warn" | "danger"; label: string }) {
  const color = tone === "ok" ? theme.color.success : tone === "warn" ? theme.color.warning : theme.color.danger;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: theme.color.border, borderRadius: 12, padding: 9, marginBottom: 6 },
  tileOk: { backgroundColor: "#fff" },
  tileWarning: { backgroundColor: theme.color.warningBg },
  tileDanger: { backgroundColor: theme.color.dangerBg },
  avatarWrap: { width: 38, height: 38 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarPlaceholder: { backgroundColor: theme.color.purple, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  name: { fontWeight: "700", fontSize: 13.5, flexShrink: 1 },
  jersey: { marginLeft: "auto", fontWeight: "800", fontSize: 11.5, color: theme.color.textMuted },
  jerseyEditable: { color: theme.color.purple },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  sep: { color: theme.color.border, fontSize: 11 },
  chev: { color: theme.color.textMuted, fontSize: 15 },
});
