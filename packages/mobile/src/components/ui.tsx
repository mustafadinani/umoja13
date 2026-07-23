import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, Modal as RNModal, StyleSheet, type ViewStyle } from "react-native";
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
    ]}>
      <Text numberOfLines={1} style={{ color: fg ?? (active ? "#fff" : theme.color.text), fontWeight: "600", fontSize: 13 }}>{children}</Text>
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
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
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
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
  },
});
