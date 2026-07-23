import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type ForfeitOutcome } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { fileIncident } from "../lib/callables";
import { Modal, PrimaryButton, Pill } from "./ui";

const OUTCOMES: { id: ForfeitOutcome; label: string }[] = [
  { id: "home_win", label: "Home team wins 5–0" },
  { id: "away_win", label: "Away team wins 5–0" },
  { id: "double_no_show", label: "Double no-show (0–0, no points)" },
];

export function ForfeitModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [outcome, setOutcome] = useState<ForfeitOutcome | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!outcome || !user || !profile) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.games, gameId), {
        forfeit: { outcome, reason: note, declaredBy: user.uid, declaredAt: Date.now() },
        status: "forfeited",
        updatedAt: Date.now(),
      });
      await fileIncident({
        source: "forfeit",
        filedByName: profile.displayName,
        filedByRole: "referee",
        gameId,
        text: note || `Forfeit declared: ${outcome}`,
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal visible onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Text style={{ fontSize: 40 }}>🚩</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 8 }}>Forfeit recorded</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6, textAlign: "center" }}>
            The commissioner has been notified. This decision is final on the field.
          </Text>
          <PrimaryButton style={{ marginTop: 16, width: "100%" }} onPress={onClose}>DONE</PrimaryButton>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 20, marginBottom: 10 }}>Declare Forfeit / No-Show</Text>

      <View style={styles.rulesBox}>
        <Text style={{ fontSize: 12, color: theme.color.textMuted, lineHeight: 18 }}>
          <Text style={{ fontWeight: "800" }}>FORFEITS & NO-SHOWS. </Text>
          Teams must be ready to play at their scheduled match time. A maximum 5-minute grace period is allowed.
          Minimum players to start: 9-aside 6 · 7-aside 5 · 5-aside 3. If a team doesn't meet the minimum after the
          grace period, declare a forfeit: the present/eligible team wins 5–0, the other team takes a 0–5 loss. The
          match is not rescheduled. If both teams fail to meet the minimum, it's a Double No-Show: recorded 0–0,
          zero points either side, no GF/GA, and neither team advances in knockout stages. Referees will not
          negotiate or extend the grace period. All forfeit/no-show decisions made on the field are final and may
          only be reviewed for disciplinary reasons, not to change the match outcome.
        </Text>
      </View>

      <View style={{ gap: 8, marginBottom: 14 }}>
        {OUTCOMES.map((o) => (
          <Pill key={o.id} active={outcome === o.id} onPress={() => setOutcome(o.id)}>{o.label}</Pill>
        ))}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional note (e.g. only 4 players present at 10:45)…"
        multiline
        numberOfLines={3}
        style={styles.textArea}
      />

      <PrimaryButton disabled={!outcome || busy} onPress={submit} style={{ width: "100%" }}>
        {busy ? "Recording…" : "CONFIRM FORFEIT"}
      </PrimaryButton>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rulesBox: { backgroundColor: "#F7F6F3", borderRadius: 8, padding: 14, marginBottom: 16 },
  textArea: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, marginBottom: 14, minHeight: 70, textAlignVertical: "top", fontSize: 13.5 },
});
