import { useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet } from "react-native";
import { addDoc, collection, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { COLLECTIONS, huntMissionIsAutoScored, type CrewMember } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme, hunterGradient } from "../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useHuntCrews, useHuntMissions, useMyCrew, useMyInvites } from "../hooks/useData";
import { Card, Pill, PrimaryButton, Modal } from "../components/ui";

export function HuntScreen() {
  const { user, profile } = useAuth();
  const { data: crew } = useMyCrew(user?.uid);
  const { data: missions } = useHuntMissions();
  const { data: leaderboard } = useHuntCrews();
  const { data: invites } = useMyInvites(profile?.email);
  const [seg, setSeg] = useState<"missions" | "leaderboard">("missions");
  const [crewName, setCrewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  const [triviaChoice, setTriviaChoice] = useState<number | null>(null);

  const pendingInvite = invites.find((c) => c.members.find((m) => m.email === profile?.email.toLowerCase())?.status === "invited" && !c.locked);
  const openMission = missions.find((m) => m.id === openMissionId) ?? null;

  async function createCrew() {
    if (!user || !profile || crewName.trim().length < 2) return;
    setBusy(true);
    try {
      const lead: CrewMember = { userId: user.uid, name: profile.displayName, email: profile.email.toLowerCase(), status: "accepted", invitedAt: Date.now() };
      await addDoc(collection(db, COLLECTIONS.huntCrews), {
        name: crewName, leadUserId: user.uid, members: [lead], memberUids: [user.uid], memberEmails: [lead.email],
        locked: false, points: 0, missionsCompleted: [], createdAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }

  async function respondInvite(accept: boolean) {
    if (!pendingInvite || !user || !profile) return;
    const members = pendingInvite.members.map((m) =>
      m.email === profile.email.toLowerCase() ? { ...m, status: accept ? "accepted" : "declined", userId: accept ? user.uid : m.userId } : m
    );
    await updateDoc(doc(db, COLLECTIONS.huntCrews, pendingInvite.id), { members, ...(accept ? { memberUids: arrayUnion(user.uid) } : {}) });
  }

  async function completeInstant(correct: boolean) {
    if (!crew || !openMission) return;
    if (correct) {
      await updateDoc(doc(db, COLLECTIONS.huntCrews, crew.id), { points: crew.points + openMission.points, missionsCompleted: arrayUnion(openMission.id) });
    }
    setOpenMissionId(null);
    setTriviaChoice(null);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <LinearGradient colors={hunterGradient} style={styles.hero}>
        <Text style={styles.heroTitle}>THE HUNT</Text>
        <Text style={styles.heroSub}>45 missions across 3 days. $500 grand prize.</Text>
      </LinearGradient>

      <View style={{ padding: 16 }}>
        {pendingInvite && (
          <Card style={{ backgroundColor: theme.color.warningBg, borderWidth: 0, marginBottom: 16 }}>
            <Text style={{ fontWeight: "700" }}>You're invited to join "{pendingInvite.name}"</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <PrimaryButton onPress={() => respondInvite(true)}>ACCEPT</PrimaryButton>
            </View>
          </Card>
        )}

        {!crew ? (
          <Card>
            <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 8 }}>Start your crew</Text>
            <TextInput
              placeholder="Crew name"
              value={crewName}
              onChangeText={setCrewName}
              style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, marginBottom: 12 }}
            />
            <PrimaryButton disabled={crewName.trim().length < 2 || busy} onPress={createCrew} style={{ width: "100%" }}>
              {busy ? "Creating…" : "CREATE CREW & JOIN"}
            </PrimaryButton>
          </Card>
        ) : (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: "800", fontSize: 16 }}>{crew.name}</Text>
              <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>{crew.points} pts · {crew.missionsCompleted.length} done</Text>
            </Card>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <Pill active={seg === "missions"} onPress={() => setSeg("missions")}>MISSIONS</Pill>
              <Pill active={seg === "leaderboard"} onPress={() => setSeg("leaderboard")}>LEADERBOARD</Pill>
            </View>

            {seg === "missions"
              ? missions.map((m) => {
                  const isDone = crew.missionsCompleted.includes(m.id);
                  return (
                    <Card key={m.id} onPress={() => setOpenMissionId(m.id)} style={{ marginBottom: 6, opacity: isDone ? 0.6 : 1 }}>
                      <Text style={{ fontWeight: "600" }}>{m.title}</Text>
                      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>{isDone ? "Done ✓" : `${m.subtitle} · +${m.points}`}</Text>
                    </Card>
                  );
                })
              : leaderboard.map((c, i) => (
                  <Card key={c.id} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "700" }}>{i + 1}. {c.name}{c.id === crew.id ? " (you)" : ""}</Text>
                    <Text style={{ fontWeight: "800" }}>{c.points} pts</Text>
                  </Card>
                ))}
          </>
        )}
      </View>

      <Modal visible={!!openMission} onClose={() => setOpenMissionId(null)}>
        {openMission && (
          <View>
            <Text style={{ fontWeight: "800", fontSize: 17 }}>{openMission.title}</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 12, marginVertical: 6 }}>{openMission.subtitle} · +{openMission.points} pts</Text>
            <Text style={{ marginBottom: 14 }}>{openMission.description}</Text>
            {openMission.type === "trivia" && openMission.options ? (
              <>
                {openMission.options.map((opt, idx) => (
                  <Pill key={idx} active={triviaChoice === idx} onPress={() => setTriviaChoice(idx)}>{opt}</Pill>
                ))}
                <PrimaryButton disabled={triviaChoice === null} onPress={() => completeInstant(triviaChoice === openMission.answerIndex)} style={{ marginTop: 12, width: "100%" }}>
                  SUBMIT ANSWER
                </PrimaryButton>
              </>
            ) : huntMissionIsAutoScored(openMission.type) ? (
              <PrimaryButton onPress={() => completeInstant(true)} style={{ width: "100%" }}>CHECK IN HERE</PrimaryButton>
            ) : (
              <Text style={{ color: theme.color.textMuted }}>Submit a photo/video/text for this mission from the web app for now.</Text>
            )}
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 26 },
  heroSub: { color: "#fff", opacity: 0.9, fontSize: 13, marginTop: 6 },
});
