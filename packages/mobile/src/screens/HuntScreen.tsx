import { useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, Image, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { COLLECTIONS, huntMissionIsAutoScored, type Challenge, type CrewMember, type HuntMission, type HuntMissionType } from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme, hunterGradient } from "../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useChallenges, useHuntCrews, useHuntMissions, useMyChallengeSubmissions, useMyCrew, useMyHuntSubmissions, useMyInvites } from "../hooks/useData";
import { Card, Pill, PrimaryButton, Modal } from "../components/ui";
import { ChallengeDetailModal } from "../components/ChallengeDetailModal";
import { Lightbox } from "../components/Lightbox";

const MAX_CREW_MEMBERS = 4; // including the lead

const TYPE_ICON: Record<HuntMissionType, string> = {
  photo: "📸", video: "🎥", trivia: "🧠", gps: "📍", qr: "🔲", text: "💬", mini_game: "🎮",
};
const TYPE_ICON_BG: Record<HuntMissionType, string> = {
  photo: theme.color.purple, video: theme.color.pink, trivia: theme.color.blue,
  gps: theme.color.teal, qr: theme.color.orange, text: theme.color.purpleLight, mini_game: theme.color.gold,
};

function activeChallenge(c: Challenge, now: number) {
  if (c.startsAt && now < c.startsAt) return false;
  if (c.deadline && now > c.deadline) return false;
  return true;
}

export function HuntScreen() {
  const { user, profile } = useAuth();
  const { data: crew } = useMyCrew(user?.uid);
  const { data: missions } = useHuntMissions();
  const { data: challenges } = useChallenges();
  const { data: myChallengeSubmissions } = useMyChallengeSubmissions(crew?.id);
  const { data: myHuntSubmissions } = useMyHuntSubmissions(crew?.id);
  const { data: leaderboard } = useHuntCrews();
  const { data: invites } = useMyInvites(profile?.email);
  const [seg, setSeg] = useState<"missions" | "challenges" | "leaderboard">("missions");
  const [openChallenge, setOpenChallenge] = useState<Challenge | null>(null);
  const [crewWizardStep, setCrewWizardStep] = useState(1);
  const [crewName, setCrewName] = useState("");
  const [crewInvites, setCrewInvites] = useState<{ name: string; email: string }[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [crewError, setCrewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  const [triviaChoice, setTriviaChoice] = useState<number | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<"pending" | "correct" | "wrong" | null>(null);
  const [lightbox, setLightbox] = useState<{ uri: string; mediaType: "photo" | "video" } | null>(null);

  const pendingInvite = invites.find((c) => c.members.find((m) => m.email === profile?.email.toLowerCase())?.status === "invited" && !c.locked);
  const openMission = missions.find((m) => m.id === openMissionId) ?? null;
  const mySubmission = openMission ? myHuntSubmissions.find((s) => s.missionId === openMission.id) ?? null : null;
  const alreadyDone = openMission ? (crew?.missionsCompleted.includes(openMission.id) ?? false) : false;
  const missionStatus = alreadyDone
    ? "correct"
    : justSubmitted ?? (mySubmission?.status === "rejected" ? "rejected" : mySubmission?.status === "pending" ? "pending" : null);
  const missionPreviewUri = mediaUri ?? mySubmission?.mediaUrl ?? null;

  function openMissionDetail(id: string) {
    setOpenMissionId(id);
    setTriviaChoice(null);
    setMediaUri(null);
    setTextAnswer("");
    setSubmitError(null);
    setJustSubmitted(null);
  }

  async function pickMedia(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images", "videos"], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setMediaUri(result.assets[0].uri);
  }

  async function submitForReview() {
    if (!user || !profile || !crew || !openMission) return;
    setBusy(true);
    setSubmitError(null);
    try {
      let mediaUrl: string | null = null;
      let mediaType: "photo" | "video" | "text" | null = null;
      if (mediaUri) {
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const isVideo = mediaUri.endsWith(".mov") || mediaUri.endsWith(".mp4");
        mediaType = isVideo ? "video" : "photo";
        const path = `huntSubmissions/${user.uid}/${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, blob, { contentType: isVideo ? "video/mp4" : "image/jpeg" });
        mediaUrl = await getDownloadURL(storageRef);
      } else if (textAnswer.trim()) {
        mediaType = "text";
      }
      await addDoc(collection(db, COLLECTIONS.huntSubmissions), {
        crewId: crew.id,
        missionId: openMission.id,
        submittedBy: user.uid,
        submittedByName: profile.displayName,
        mediaType,
        mediaUrl,
        textAnswer: textAnswer.trim() || null,
        status: "pending",
        createdAt: Date.now(),
      });
      setJustSubmitted("pending");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Couldn't submit this mission.");
    } finally {
      setBusy(false);
    }
  }

  function addInvite() {
    if (!inviteEmail.includes("@") || crewInvites.length >= MAX_CREW_MEMBERS - 1) return;
    if (crewInvites.some((i) => i.email.toLowerCase() === inviteEmail.toLowerCase())) return;
    setCrewInvites((list) => [...list, { name: inviteName || inviteEmail, email: inviteEmail }]);
    setInviteName("");
    setInviteEmail("");
  }

  async function createCrew() {
    if (!user || !profile || crewName.trim().length < 2) return;
    setBusy(true);
    setCrewError(null);
    try {
      const now = Date.now();
      const lead: CrewMember = { userId: user.uid, name: profile.displayName, email: profile.email.toLowerCase(), status: "accepted", invitedAt: now };
      const inviteMembers: CrewMember[] = crewInvites.map((i) => ({ name: i.name, email: i.email.toLowerCase(), status: "invited", invitedAt: now }));
      const members = [lead, ...inviteMembers];
      await addDoc(collection(db, COLLECTIONS.huntCrews), {
        name: crewName, leadUserId: user.uid, members, memberUids: [user.uid], memberEmails: members.map((m) => m.email),
        locked: false, points: 0, missionsCompleted: [], createdAt: now,
      });
    } catch (e) {
      setCrewError(e instanceof Error ? e.message : "Couldn't create your crew.");
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
    setJustSubmitted(correct ? "correct" : "wrong");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <LinearGradient colors={hunterGradient} style={styles.hero}>
        <Text style={styles.heroTitle}>🧭 THE HUNT</Text>
        <Text style={styles.heroSub}>45 missions across 3 days, plus surprise challenges. $500 grand prize.</Text>
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
            <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 4 }}>Start your crew</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 14 }}>
              Step {crewWizardStep} of 3 · up to 4 people total, no changes once the Hunt begins.
            </Text>

            {crewWizardStep === 1 && (
              <>
                <Text style={{ fontSize: 13.5, marginBottom: 14 }}>
                  You'll be the crew lead, {profile?.displayName}. You can invite up to 3 more people — anyone with
                  an Umoja account, by email. No one can be part of two crews at once.
                </Text>
                <PrimaryButton onPress={() => setCrewWizardStep(2)} style={{ width: "100%" }}>ACCEPT & START MY CREW</PrimaryButton>
              </>
            )}

            {crewWizardStep === 2 && (
              <>
                <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>Invite crew members ({crewInvites.length}/3)</Text>
                {crewInvites.map((i) => (
                  <View key={i.email} style={styles.inviteRow}>
                    <Text style={{ fontSize: 13 }}>{i.name} · {i.email}</Text>
                    <TouchableOpacity onPress={() => setCrewInvites((l) => l.filter((x) => x.email !== i.email))}>
                      <Text style={{ color: theme.color.danger }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {crewInvites.length < MAX_CREW_MEMBERS - 1 && (
                  <View style={{ marginBottom: 16 }}>
                    <TextInput placeholder="Name" value={inviteName} onChangeText={setInviteName} style={styles.input} />
                    <TextInput
                      placeholder="Email"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={[styles.input, { marginTop: 6 }]}
                    />
                    <PrimaryButton onPress={addInvite} style={{ marginTop: 8 }}>ADD</PrimaryButton>
                  </View>
                )}
                <PrimaryButton onPress={() => setCrewWizardStep(3)} style={{ width: "100%" }}>NEXT — NAME YOUR CREW</PrimaryButton>
              </>
            )}

            {crewWizardStep === 3 && (
              <>
                <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>Crew name</Text>
                <TextInput
                  placeholder="e.g. The Adebayo Family"
                  value={crewName}
                  onChangeText={setCrewName}
                  style={[styles.input, { marginBottom: 14 }]}
                />
                {crewError && <Text style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{crewError}</Text>}
                <PrimaryButton disabled={crewName.trim().length < 2 || busy} onPress={createCrew} style={{ width: "100%" }}>
                  {busy ? "Creating…" : "CREATE CREW & JOIN THE HUNT"}
                </PrimaryButton>
              </>
            )}
          </Card>
        ) : (
          <>
            <View style={styles.progressCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                <View>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>{crew.name}</Text>
                  {(() => {
                    const rank = leaderboard.findIndex((c) => c.id === crew.id) + 1;
                    return rank > 0 ? <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12 }}>Rank #{rank} of {leaderboard.length}</Text> : null;
                  })()}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 26 }}>{crew.points}</Text>
                  <Text style={{ color: "#fff", opacity: 0.85, fontSize: 10.5 }}>POINTS</Text>
                </View>
              </View>
              {(() => {
                const totalDone = crew.missionsCompleted.length + (crew.challengesCompleted?.length ?? 0);
                const totalAvailable = missions.length + challenges.length;
                const pct = totalAvailable > 0 ? Math.round((totalDone / totalAvailable) * 100) : 0;
                return (
                  <>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={{ color: "#fff", opacity: 0.9, fontSize: 11.5, marginTop: 6 }}>{totalDone} of {totalAvailable} done ({pct}%)</Text>
                  </>
                );
              })()}
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <Pill active={seg === "missions"} onPress={() => setSeg("missions")}>MISSIONS</Pill>
              <Pill active={seg === "challenges"} onPress={() => setSeg("challenges")}>⚡ CHALLENGES</Pill>
              <Pill active={seg === "leaderboard"} onPress={() => setSeg("leaderboard")}>LEADERBOARD</Pill>
            </View>

            {seg === "missions" && (() => {
              const row = (m: HuntMission) => {
                const isDone = crew.missionsCompleted.includes(m.id);
                const submission = myHuntSubmissions.find((s) => s.missionId === m.id) ?? null;
                const isPending = !isDone && submission?.status === "pending";
                const isRejected = !isDone && submission?.status === "rejected";
                return (
                  <Card key={m.id} onPress={() => openMissionDetail(m.id)} style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={[styles.typeIcon, { backgroundColor: isDone ? theme.color.successBg : TYPE_ICON_BG[m.type] }]}>
                      <Text style={{ fontSize: 16 }}>{isDone ? "✓" : TYPE_ICON[m.type]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "600", textDecorationLine: isDone ? "line-through" : "none", color: isDone ? theme.color.textMuted : theme.color.text }}>{m.title}</Text>
                      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>
                        {isDone ? `Done ✓ — +${m.points} pts earned` : isPending ? "Submitted — pending review" : isRejected ? "Not approved — tap to resubmit" : m.subtitle}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "800", color: isDone ? theme.color.success : theme.color.pink }}>+{m.points}</Text>
                  </Card>
                );
              };
              const notDone = missions.filter((m) => !crew.missionsCompleted.includes(m.id));
              const done = missions.filter((m) => crew.missionsCompleted.includes(m.id));
              return (
                <>
                  {notDone.map(row)}
                  {done.length > 0 && (
                    <>
                      <Text style={styles.sectionDivider}>COMPLETED ({done.length})</Text>
                      {done.map(row)}
                    </>
                  )}
                </>
              );
            })()}

            {seg === "challenges" && (
              challenges.length === 0 ? (
                <Text style={{ color: theme.color.textMuted, textAlign: "center", padding: 20 }}>No challenges yet — check back throughout the weekend.</Text>
              ) : (() => {
                const row = (c: Challenge) => {
                  const isDone = crew.challengesCompleted?.includes(c.id) ?? false;
                  const mySub = myChallengeSubmissions.find((s) => s.challengeId === c.id) ?? null;
                  const isActive = activeChallenge(c, Date.now());
                  const bonus = mySub?.bonusPoints ?? 0;
                  const total = c.points + bonus;
                  return (
                    <Card key={c.id} onPress={() => setOpenChallenge(c)} style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 12, opacity: isActive || isDone ? 1 : 0.55 }}>
                      <View style={[styles.typeIcon, { backgroundColor: isDone ? theme.color.successBg : "#FFF0E8" }]}>
                        <Text style={{ fontSize: 17 }}>{isDone ? "✓" : "⚡"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "600" }}>{c.title}</Text>
                        <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>
                          {isDone
                            ? `Done ✓ — ${c.points}${bonus ? ` + ${bonus} early-bird` : ""} = ${total} pts`
                            : mySub?.status === "pending"
                            ? "Submitted — pending review"
                            : mySub?.status === "rejected"
                            ? "Not approved — tap to resubmit"
                            : !isActive
                            ? "Not open"
                            : c.earlyBirdBonuses.length > 0
                            ? "⚡ Early-bird bonus available"
                            : "Open now"}
                        </Text>
                      </View>
                      <Text style={{ fontWeight: "800", color: isDone ? theme.color.success : theme.color.orange }}>+{isDone ? total : c.points}</Text>
                    </Card>
                  );
                };
                const notDone = challenges.filter((c) => !(crew.challengesCompleted?.includes(c.id) ?? false));
                const done = challenges.filter((c) => crew.challengesCompleted?.includes(c.id) ?? false);
                return (
                  <>
                    {notDone.map(row)}
                    {done.length > 0 && (
                      <>
                        <Text style={styles.sectionDivider}>COMPLETED ({done.length})</Text>
                        {done.map(row)}
                      </>
                    )}
                  </>
                );
              })()
            )}

            {seg === "leaderboard" && leaderboard.map((c, i) => (
              <Card key={c.id} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {c.name}{c.id === crew.id ? " (you)" : ""}</Text>
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

            {missionStatus === "correct" && (
              <View style={{ backgroundColor: theme.color.successBg, borderRadius: 8, padding: 12 }}>
                <Text style={{ color: theme.color.success, fontWeight: "700", textAlign: "center" }}>Done ✓ — +{openMission.points} pts earned for your crew.</Text>
              </View>
            )}
            {missionStatus === "wrong" && (
              <View style={{ backgroundColor: theme.color.dangerBg, borderRadius: 8, padding: 12 }}>
                <Text style={{ color: theme.color.danger, fontWeight: "700", textAlign: "center" }}>Not quite — trivia only gets one shot per crew.</Text>
              </View>
            )}
            {missionStatus === "pending" && (
              <>
                {missionPreviewUri && mySubmission?.mediaType !== "text" && (
                  <TouchableOpacity onPress={() => setLightbox({ uri: missionPreviewUri, mediaType: mySubmission?.mediaType === "video" ? "video" : "photo" })}>
                    <Image source={{ uri: missionPreviewUri }} style={{ width: "100%", height: 160, borderRadius: 8, marginBottom: 12 }} />
                  </TouchableOpacity>
                )}
                {mySubmission?.textAnswer && (
                  <View style={{ backgroundColor: "#F7F6F3", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <Text style={{ fontSize: 13.5 }}>"{mySubmission.textAnswer}"</Text>
                  </View>
                )}
                <View style={{ backgroundColor: theme.color.warningBg, borderRadius: 8, padding: 12 }}>
                  <Text style={{ color: theme.color.warning, fontWeight: "700", textAlign: "center" }}>Submitted — a facilitator will take a look shortly.</Text>
                </View>
              </>
            )}
            {missionStatus === "rejected" && mySubmission?.mediaUrl && (
              <TouchableOpacity onPress={() => setLightbox({ uri: mySubmission.mediaUrl!, mediaType: mySubmission.mediaType === "video" ? "video" : "photo" })}>
                <Image source={{ uri: mySubmission.mediaUrl }} style={{ width: "100%", height: 160, borderRadius: 8, marginBottom: 12 }} />
              </TouchableOpacity>
            )}
            {missionStatus === "rejected" && (
              <View style={{ backgroundColor: theme.color.dangerBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: theme.color.danger, fontWeight: "700", textAlign: "center" }}>Not approved — try submitting again.</Text>
              </View>
            )}

            {(missionStatus === null || missionStatus === "rejected") && (
              openMission.type === "trivia" && openMission.options ? (
                <>
                  {openMission.options.map((opt, idx) => (
                    <Pill key={idx} active={triviaChoice === idx} onPress={() => setTriviaChoice(idx)}>{opt}</Pill>
                  ))}
                  <PrimaryButton disabled={triviaChoice === null} onPress={() => completeInstant(triviaChoice === openMission.answerIndex)} style={{ marginTop: 12, width: "100%" }}>
                    SUBMIT ANSWER
                  </PrimaryButton>
                </>
              ) : huntMissionIsAutoScored(openMission.type) ? (
                <PrimaryButton onPress={() => completeInstant(true)} style={{ width: "100%" }}>
                  {openMission.type === "gps" ? "📍 CHECK IN HERE" : "🔲 SCAN THE QR CODE"}
                </PrimaryButton>
              ) : (
                <>
                  {(openMission.type === "photo" || openMission.type === "video" || openMission.type === "mini_game") && (
                    mediaUri ? (
                      <TouchableOpacity onPress={() => setLightbox({ uri: mediaUri, mediaType: openMission.type === "video" ? "video" : "photo" })}>
                        <Image source={{ uri: mediaUri }} style={{ width: "100%", height: 160, borderRadius: 8, marginBottom: 12 }} />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                        <PrimaryButton onPress={() => pickMedia(true)} style={{ flex: 1 }}>📷 Camera</PrimaryButton>
                        <PrimaryButton onPress={() => pickMedia(false)} style={{ flex: 1 }}>🖼 Library</PrimaryButton>
                      </View>
                    )
                  )}
                  {openMission.type === "text" && (
                    <TextInput
                      value={textAnswer}
                      onChangeText={setTextAnswer}
                      placeholder="Your answer…"
                      multiline
                      numberOfLines={3}
                      style={styles.textArea}
                    />
                  )}
                  {submitError && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{submitError}</Text>}
                  <PrimaryButton disabled={(!mediaUri && !textAnswer.trim()) || busy} onPress={submitForReview} style={{ width: "100%" }}>
                    {busy ? "Submitting…" : missionStatus === "rejected" ? "RESUBMIT" : "SUBMIT FOR REVIEW"}
                  </PrimaryButton>
                </>
              )
            )}
          </View>
        )}
      </Modal>

      {openChallenge && crew && (
        <ChallengeDetailModal
          challenge={openChallenge}
          crew={crew}
          mySubmission={myChallengeSubmissions.find((s) => s.challengeId === openChallenge.id) ?? null}
          onClose={() => setOpenChallenge(null)}
        />
      )}

      <Lightbox visible={!!lightbox} src={lightbox?.uri ?? null} mediaType={lightbox?.mediaType} onClose={() => setLightbox(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 26 },
  heroSub: { color: "#fff", opacity: 0.9, fontSize: 13, marginTop: 6 },
  textArea: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, marginBottom: 12, minHeight: 70, textAlignVertical: "top" },
  input: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
  inviteRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F7F6F3", borderRadius: 8, padding: 10, marginBottom: 6 },
  progressCard: { backgroundColor: theme.color.navy, borderRadius: 16, padding: 16, marginBottom: 16 },
  progressTrack: { height: 8, borderRadius: 99, backgroundColor: "rgba(255,255,255,.25)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.color.gold, borderRadius: 99 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionDivider: { fontWeight: "800", fontSize: 11.5, color: theme.color.textMuted, letterSpacing: 0.5, marginTop: 10, marginBottom: 6 },
});
