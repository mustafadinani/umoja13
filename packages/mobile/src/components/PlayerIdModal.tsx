import { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { checkInStatusLabel, suspensionReasonLabel, type PlayerSuspensionStatus, type RosterEntry, type Category } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";
import { Lightbox } from "./Lightbox";

export function PlayerIdModal({
  player,
  teamName,
  category,
  cleared,
  suspension,
  onToggleClear,
  onClose,
}: {
  player: RosterEntry;
  teamName: string;
  category?: Category;
  cleared: boolean;
  suspension?: PlayerSuspensionStatus;
  onToggleClear: () => void;
  onClose: () => void;
}) {
  const approved = player.checkInStatus === "approved";
  const [zoomed, setZoomed] = useState(false);

  return (
    <Modal visible onClose={onClose}>
      <View style={{ alignItems: "center" }}>
        <TouchableOpacity
          disabled={!player.selfieUrl}
          onPress={() => setZoomed(true)}
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
        >
          {player.selfieUrl && <Image source={{ uri: player.selfieUrl }} style={{ width: "100%", height: "100%" }} />}
        </TouchableOpacity>
        <Text style={{ fontWeight: "900", fontSize: 44, color: theme.color.purple, lineHeight: 48 }}>#{player.jerseyNumber ?? "—"}</Text>
        <Text style={{ fontWeight: "800", fontSize: 28, marginTop: 6, textAlign: "center" }}>{player.displayName}</Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" }}>
          {teamName} · {category?.label ?? ""}
        </Text>

        {suspension?.suspended && (
          <View style={{ backgroundColor: theme.color.dangerBg, borderRadius: 8, padding: 12, marginTop: 14, width: "100%" }}>
            <Text style={{ color: theme.color.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>
              🚫 Flagged suspended for this game{suspension.reason ? ` — ${suspensionReasonLabel(suspension.reason)}` : ""}. Referee's call whether to clear them anyway.
            </Text>
          </View>
        )}

        {approved ? (
          <>
            <View style={{ backgroundColor: cleared ? theme.color.successBg : theme.color.warningBg, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 16 }}>
              <Text style={{ color: cleared ? theme.color.success : theme.color.warning, fontWeight: "700", fontSize: 13 }}>
                {cleared ? "VERIFIED · CLEARED BY REF ✓" : "VERIFIED · NOT CLEARED YET"}
              </Text>
            </View>
            <PrimaryButton
              onPress={onToggleClear}
              style={{ marginTop: 16, width: "100%", backgroundColor: cleared ? theme.color.success : theme.color.navy }}
            >
              {cleared ? "CLEARED — TAP TO UNDO" : "PHOTO MATCHES — CLEAR PLAYER"}
            </PrimaryButton>
          </>
        ) : (
          <View style={{ backgroundColor: theme.color.dangerBg, borderRadius: 8, padding: 12, marginTop: 16, width: "100%" }}>
            <Text style={{ color: theme.color.danger, fontWeight: "700", fontSize: 13, textAlign: "center" }}>
              NOT VERIFIED — {checkInStatusLabel(player.checkInStatus)}
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
          <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>Close</Text>
        </TouchableOpacity>
      </View>
      <Lightbox visible={zoomed} src={player.selfieUrl ?? null} onClose={() => setZoomed(false)} />
    </Modal>
  );
}
