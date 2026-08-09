import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, Modal as RNModal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, type ViewStyle } from "react-native";
import { checkInStatusLabel, checkInStatusTone, type CheckInStatus } from "@umoja/shared";
import { theme } from "../lib/theme";

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={[styles.card, style]} activeOpacity={0.7}>
      {children}
    </Wrapper>
  );
}

export function Pill({
  children, active, onPress, bg, fg,
}: { children: ReactNode; active?: boolean; onPress?: () => void; bg?: string; fg?: string }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.7} style={[
      styles.pill,
      { backgroundColor: bg ?? (active ? theme.color.navy : "#F1EFF5") },
      !active && !bg ? styles.pillInactiveBorder : null,
    ]}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={{ color: fg ?? (active ? "#fff" : theme.color.text), fontWeight: "600", fontSize: 13, lineHeight: 16 }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export function PrimaryButton({
  children, onPress, disabled, style,
}: { children: ReactNode; onPress?: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8} style={[
      styles.primaryButton,
      { backgroundColor: disabled ? "#C9C3D8" : theme.color.navy },
      style,
    ]}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 }}>{children}</Text>
    </TouchableOpacity>
  );
}

export function Modal({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
            <ScrollView contentContainerStyle={styles.modalCardContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

export function Drawer({
  visible,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Rendered outside the scrollable area, pinned to the bottom of the drawer — use for an always-reachable action like DONE on a long scrollable list. */
  footer?: ReactNode;
}) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.drawerScrim} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.drawerCard} onPress={() => {}}>
          <View style={styles.drawerHandle} />
          <TouchableOpacity onPress={onClose} style={styles.drawerCloseBtn}>
            <Text style={{ fontSize: 15 }}>✕</Text>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer && <View style={styles.drawerFooter}>{footer}</View>}
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}

/** Initials circle for a person — the one avatar look used anywhere a name needs a face-shaped placeholder (pod rosters, member lists) without an actual photo on file. */
export function Avatar({ name, size = 28, color }: { name: string; size?: number; color?: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? theme.color.purple, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
}

/** Overlapping avatar row (a "who's here" glance) — caps how many render before collapsing the rest into a "+N" tail. */
export function AvatarStack({ names, size = 20, colorFor, max = 4 }: { names: string[]; size?: number; colorFor?: (name: string) => string; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {shown.map((n, i) => (
        <View key={n + i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, borderWidth: 2, borderColor: "#fff", borderRadius: size / 2 }}>
          <Avatar name={n} size={size} color={colorFor?.(n)} />
        </View>
      ))}
      {extra > 0 && <Text style={{ fontSize: 10.5, color: theme.color.textMuted, marginLeft: 5 }}>+{extra}</Text>}
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    scheduled: { bg: "#F1EFF5", fg: theme.color.textMuted, label: "Upcoming" },
    live: { bg: theme.color.dangerBg, fg: theme.color.danger, label: "● LIVE" },
    final: { bg: theme.color.successBg, fg: theme.color.success, label: "Final" },
    forfeited: { bg: theme.color.dangerBg, fg: theme.color.danger, label: "Forfeited" },
  };
  const s = map[status] ?? { bg: "#F1EFF5", fg: theme.color.textMuted, label: status };
  return <Pill bg={s.bg} fg={s.fg}>{s.label}</Pill>;
}

const CHECKIN_TONE_COLORS: Record<"success" | "warning" | "muted" | "danger", { fg: string; bg: string }> = {
  success: { fg: theme.color.success, bg: theme.color.successBg },
  warning: { fg: theme.color.warning, bg: theme.color.warningBg },
  muted: { fg: theme.color.textMuted, bg: theme.color.bg },
  danger: { fg: theme.color.danger, bg: theme.color.dangerBg },
};

/**
 * Diagonal "VERIFIED" ribbon across the corner of a player's photo — the one
 * visual for "this identity is confirmed," reused on the Tournament Pass and
 * the player card so it means the same thing everywhere it shows up.
 */
export function VerifiedRibbon() {
  return (
    <View style={styles.verifiedRibbon}>
      <Text style={styles.verifiedRibbonText}>VERIFIED</Text>
    </View>
  );
}

/** Small checkmark badge for compact avatars (roster rows) where a full ribbon won't fit — same green, same meaning, just scaled down. */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <View
      style={[
        styles.verifiedBadge,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ color: "#fff", fontSize: size * 0.55, fontWeight: "900", lineHeight: size * 0.6 }}>✓</Text>
    </View>
  );
}

/** The one check-in status pill — same label vocabulary and colors (green/amber/muted) wherever a status needs to read as a chip rather than plain text. */
export function CheckInStatusPill({ status }: { status: CheckInStatus | undefined }) {
  const { fg, bg } = CHECKIN_TONE_COLORS[checkInStatusTone(status)];
  return (
    <Pill bg={bg} fg={fg}>
      {checkInStatusLabel(status)}
    </Pill>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  pillInactiveBorder: {
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  primaryButton: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: theme.radius.sm,
    alignItems: "center",
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(17,12,32,.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: theme.radius.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalCardContent: {
    padding: 20,
  },
  drawerScrim: {
    flex: 1,
    backgroundColor: "rgba(17,12,32,.5)",
    justifyContent: "flex-end",
  },
  drawerCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    height: "90%",
    overflow: "hidden",
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color.border,
    alignSelf: "center",
    marginTop: 10,
  },
  drawerCloseBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1EFF5",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  drawerContent: {
    padding: 20,
    paddingTop: 24,
  },
  drawerFooter: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
  verifiedRibbon: {
    position: "absolute",
    top: 20,
    right: -42,
    width: 160,
    transform: [{ rotate: "45deg" }],
    backgroundColor: theme.color.success,
    alignItems: "center",
    paddingVertical: 5,
  },
  verifiedRibbonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    backgroundColor: theme.color.success,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
