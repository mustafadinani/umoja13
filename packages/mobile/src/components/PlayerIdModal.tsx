import { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { checkInStatusLabel, type RosterEntry, type Category } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal, PrimaryButton } from "./ui";
import { Lightbox } from "./Lightbox";

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
        <Text style={{ fontWeight: "800", fontSize: 20 }}>{player.displayName}</Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" }}>
          #{player.jerseyNumber ?? "—"} · {teamName} · {category?.label ?? ""}
        </Text>

        {approved ? (
          <>
            <View style={{ backgroundColor: cleared ? theme.color.successBg : theme.color.warningBg, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 16 }}>
              <Text style={{ color: cleared ? theme.color.success : theme.color.warning, fontWeight: "700", fontSize: 13 }}>
                {cleared ? "VERIFIED · CHECKED-IN ✓" : "VERIFIED · NEEDS CHECK-IN"}
              </Text>
            </View>
            <PrimaryButton
              onPress={onToggleClear}
              style={{ marginTop: 16, width: "100%", backgroundColor: cleared ? theme.color.success : theme.color.navy }}
            >
              {cleared ? "CHECKED-IN — TAP TO UNDO" : "PHOTO MATCHES — CHECK IN"}
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
