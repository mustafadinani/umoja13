import { View, Text, TouchableOpacity } from "react-native";
import type { RosterEntry, Category } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";

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
    <Modal visible onClose={onClose}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            marginBottom: 12,
            backgroundColor: player.selfieUrl ? undefined : theme.color.purple,
            borderWidth: 3,
            borderColor: approved ? theme.color.gold : theme.color.border,
            overflow: "hidden",
          }}
        />
        <Text style={{ fontWeight: "800", fontSize: 20 }}>{player.displayName}</Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" }}>
          #{player.jerseyNumber ?? "—"} · {teamName} · {category?.label ?? ""}
        </Text>

        {approved ? (
          <>
            <View style={{ backgroundColor: theme.color.successBg, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 16 }}>
              <Text style={{ color: theme.color.success, fontWeight: "700", fontSize: 13 }}>Tournament Pass approved ✓</Text>
            </View>
            <PrimaryButton
              onPress={onToggleClear}
              style={{ marginTop: 16, width: "100%", backgroundColor: cleared ? theme.color.success : theme.color.navy }}
            >
              {cleared ? "CLEARED — TAP TO UNDO" : "PHOTO MATCHES — CLEAR TO PLAY"}
            </PrimaryButton>
          </>
        ) : (
          <View style={{ backgroundColor: theme.color.dangerBg, borderRadius: 8, padding: 12, marginTop: 16, width: "100%" }}>
            <Text style={{ color: theme.color.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>
              NOT CLEARED — {player.checkInStatus === "not_started" ? "hasn't checked in" : "pending admin approval"}
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
          <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
