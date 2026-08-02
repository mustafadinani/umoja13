import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CATEGORIES, COLLECTIONS, type PlayerMembership, type CheckIn, type TournamentPass } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useDocument } from "../hooks/firestore";
import { Card, PrimaryButton, Modal } from "./ui";

function checkInIdFor(uid: string, membership: PlayerMembership): string {
  return `${uid}_${membership.teamId}_${membership.categoryId}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Cleared to play ✓";
    case "pending_review":
      return "AI verifying your check-in…";
    case "admin_review":
      return "Sent to an admin for review";
    case "rejected":
      return "Verification failed — please retry";
    default:
      return "Not checked in yet";
  }
}

/** Same check-in card UX as web: button only for known categories. */
export function CheckInCard({
  uid,
  membership,
  onCheckIn,
}: {
  uid: string;
  membership: PlayerMembership;
  onCheckIn: () => void;
}) {
  const checkInId = checkInIdFor(uid, membership);
  const { data: checkIn } = useDocument<CheckIn>(COLLECTIONS.checkIns, checkInId);
  const { data: pass } = useDocument<TournamentPass>(COLLECTIONS.tournamentPasses, checkInId);
  const [passOpen, setPassOpen] = useState(false);
  const category = CATEGORIES.find((c) => c.id === membership.categoryId);
  const status = checkIn?.status ?? "not_started";

  // Parent screen hides unknown categories when another valid membership exists.
  if (!category) return null;

  return (
    <Card style={{ marginBottom: 8 }}>
      <View style={styles.row}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontWeight: "700" }}>{category.label}</Text>
          <Text style={styles.status}>{statusLabel(status)}</Text>
        </View>
        {status === "approved" && pass ? (
          <PrimaryButton onPress={() => setPassOpen(true)} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            VIEW PASS
          </PrimaryButton>
        ) : status === "pending_review" ? (
          <Text style={styles.pending}>Checking…</Text>
        ) : status === "admin_review" ? (
          <Text style={styles.pending}>Pending review</Text>
        ) : status === "rejected" ? null : (
          <PrimaryButton onPress={onCheckIn} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            CHECK IN
          </PrimaryButton>
        )}
      </View>
      {status === "rejected" && (
        <PrimaryButton onPress={onCheckIn} style={{ marginTop: 10, width: "100%" }}>
          RETRY CHECK-IN
        </PrimaryButton>
      )}

      <Modal visible={passOpen} onClose={() => setPassOpen(false)}>
        <Text style={styles.passTitle}>TOURNAMENT PASS</Text>
        <Text style={[styles.status, { textAlign: "center", marginBottom: 12 }]}>{category.label}</Text>
        {pass?.status === "approved" ? (
          <>
            <View style={styles.qrPlaceholder} />
            <Text style={[styles.status, { textAlign: "center", marginTop: 8 }]}>{pass.passId}</Text>
          </>
        ) : (
          <Text style={styles.passPending}>PENDING REVIEW</Text>
        )}
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  status: { color: theme.color.textMuted, fontSize: 12, marginTop: 2 },
  pending: { color: theme.color.warning, fontSize: 12.5, fontWeight: "700" },
  passTitle: { fontWeight: "800", fontSize: 18, textAlign: "center" },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignSelf: "center",
    borderRadius: 8,
    backgroundColor: theme.color.navy,
  },
  passPending: {
    paddingVertical: 40,
    textAlign: "center",
    color: theme.color.warning,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
