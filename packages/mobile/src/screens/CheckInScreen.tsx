import { useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, setDoc, getDoc, deleteField } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  COLLECTIONS,
  CATEGORIES,
  CHECKIN_CONSENT_POLICY_VERSION,
  PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS,
  PROFESSIONS,
  TOURNAMENT_START_AT,
  categoryLabelFor,
  checkInIdFor,
  isNonCompetitiveCategory,
  playerKeyFor,
  rosterCheckInIdFor,
} from "@umoja/shared";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useCheckIn, usePass, useRosterCheckIn, useMyVolunteerApplications } from "../hooks/useData";
import { setJerseyNumber } from "../lib/callables";
import { PrimaryButton } from "../components/ui";
import { VolunteerSignupModal } from "../components/VolunteerSignupModal";

type Step = "confirm" | "fieldPref" | "consent" | "details" | "selfie" | "govid" | "submitting" | "result";

export function CheckInScreen({ route }: NativeStackScreenProps<RootStackParamList, "CheckIn">) {
  const { teamId, categoryId, profileId } = route.params;
  const { user, profile } = useAuth();
  // Match on profileId first — teamId+categoryId alone is ambiguous whenever
  // two siblings on the same family account share a team and category, and
  // .find() would silently return whichever kid happens to sit first in the
  // array (this was the "check-in kept reverting to the wrong sibling" bug).
  // profileId is only missing for a legacy nav call that predates this field,
  // so the fallback keeps those working exactly as before.
  const membership = profileId
    ? profile?.playerOf?.find((m) => m.teamId === teamId && m.categoryId === categoryId && (m.profileId?.trim() || user?.uid) === profileId)
    : profile?.playerOf?.find((m) => m.teamId === teamId && m.categoryId === categoryId);
  // Unique per child (falls back to the account uid only if this membership
  // predates profileId) — never the bare uid, which every sibling shares.
  const playerKey = user ? playerKeyFor(user.uid, membership?.profileId) : "";
  const checkInId = user ? checkInIdFor(playerKey, teamId, categoryId) : "";
  const { data: existingCheckIn } = useCheckIn(checkInId);
  const { data: pass } = usePass(checkInId);
  const { data: rosterInfo } = useRosterCheckIn(user ? rosterCheckInIdFor(teamId, playerKey, categoryId) : undefined);
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const asksFieldPreference = PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS.includes(categoryId);
  const jerseyNumbersLocked = Date.now() >= TOURNAMENT_START_AT;

  const [step, setStep] = useState<Step>(existingCheckIn?.status === "approved" ? "result" : "confirm");
  const [jerseyNumberDraft, setJerseyNumberDraft] = useState("");
  const [profession, setProfession] = useState(existingCheckIn?.lineOfWork ?? "");
  const [professionQuery, setProfessionQuery] = useState("");
  const [acceptedBy, setAcceptedBy] = useState<"self" | "guardian" | null>(null);
  const [guardianName, setGuardianName] = useState("");
  const [privateFieldPreference, setPrivateFieldPreference] = useState<boolean | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [govIdUri, setGovIdUri] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string } | null>(
    existingCheckIn?.status === "approved" ? { status: "approved" } : null
  );
  const [submitStatus, setSubmitStatus] = useState("Sending to staff…");
  const [error, setError] = useState<string | null>(null);
  const [volunteerSignupOpen, setVolunteerSignupOpen] = useState(false);
  const canContinueFromDetails =
    rosterInfo?.jerseyNumber != null || jerseyNumbersLocked || jerseyNumberDraft.trim() === "" || /^\d{1,3}$/.test(jerseyNumberDraft.trim());
  const canContinueFromConsent = acceptedBy !== null && (acceptedBy === "self" || guardianName.trim().length > 0);
  const { data: volunteerApplications } = useMyVolunteerApplications(user?.uid);
  const playerName = (membership?.playerName ?? profile?.displayName ?? "").trim();
  // Checked per player name, not the account's overall volunteer role — a
  // parent should still be able to sign up a different kid separately even
  // after one kid's application is already approved.
  const hasVolunteerApplication = volunteerApplications.some(
    (a) => a.name.trim() === playerName && a.status !== "rejected"
  );

  // Toddlers Camp categoryIds are real, checkin-able registrations that are
  // intentionally NOT in CATEGORIES (no games/standings for camp) — only
  // block on a categoryId that matches neither list, which is genuinely broken.
  if (!category && !isNonCompetitiveCategory(categoryId)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 8 }}>Category not found</Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 13, lineHeight: 20 }}>
          This player is registered under a category that isn’t in the tournament list
          {categoryId ? ` (id: ${categoryId})` : ""}. Valid categories look like Boy's 8 & Under.
          Contact an admin to fix the assignment before check-in.
        </Text>
      </View>
    );
  }

  async function capture(setUri: (u: string) => void) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    // Lower quality than a typical capture — these are reviewed at modest
    // size for identity verification, not printed, and a smaller file
    // uploads far more reliably over spotty venue wifi.
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.4 });
    if (!r.canceled && r.assets[0]) setUri(r.assets[0].uri);
  }

  // A slow/stalled network can otherwise leave "Sending to staff…" spinning
  // forever with zero feedback — race every network step against a hard
  // timeout so a bad connection turns into a clear, retryable error instead.
  function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out — check your connection and try again.`)), ms)),
    ]);
  }

  async function uploadUri(uri: string, path: string): Promise<string> {
    const response = await withTimeout(fetch(uri), 20000, "Reading photo");
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await withTimeout(uploadBytes(storageRef, blob, { contentType: "image/jpeg" }), 45000, "Photo upload");
    return withTimeout(getDownloadURL(storageRef), 20000, "Finalizing photo");
  }

  async function submit() {
    if (!user || !profile || !selfieUri || !govIdUri) return;
    setStep("submitting");
    setSubmitStatus("Sending to staff…");
    setError(null);
    try {
      const existing = await withTimeout(getDoc(doc(db, COLLECTIONS.checkIns, checkInId)), 15000, "Loading your check-in");
      const attempt = existing.exists() ? (existing.data().attempt ?? 0) + 1 : 1;
      setSubmitStatus("Uploading selfie…");
      const selfieUrl = await uploadUri(selfieUri, `checkins/${user.uid}/${checkInId}/selfie-${Date.now()}.jpg`);
      setSubmitStatus("Uploading ID…");
      const govIdUrl = await uploadUri(govIdUri, `checkins/${user.uid}/${checkInId}/govid-${Date.now()}.jpg`);
      setSubmitStatus("Saving…");
      await withTimeout(
        setDoc(
          doc(db, COLLECTIONS.checkIns, checkInId),
          {
            id: checkInId,
            userId: user.uid,
            playerKey,
            teamId,
            categoryId,
            status: "admin_review",
            selfieUrl,
            govIdUrl,
            submittedAt: Date.now(),
            attempt,
            consent: {
              acceptedBy: acceptedBy as "self" | "guardian",
              guardianName: acceptedBy === "guardian" ? guardianName.trim() : null,
              acceptedAt: Date.now(),
              policyVersion: CHECKIN_CONSENT_POLICY_VERSION,
            },
            ...(asksFieldPreference && privateFieldPreference !== null ? { privateFieldPreference } : {}),
            // Profession only ever applies to the adult checking in for
            // themselves — never recorded for a guardian's minor. Explicitly
            // cleared (not just omitted) on a guardian resubmission, or a
            // merge:true write would leave an earlier self-submission's
            // profession stuck on this check-in forever.
            lineOfWork: acceptedBy === "self" && profession ? profession : deleteField(),
          },
          { merge: true }
        ),
        15000,
        "Saving your check-in"
      );

      if (!jerseyNumbersLocked && rosterInfo?.jerseyNumber == null && jerseyNumberDraft.trim()) {
        await withTimeout(
          setJerseyNumber({
            teamId,
            playerKey,
            categoryId,
            jerseyNumber: Number(jerseyNumberDraft.trim()),
          }),
          15000,
          "Saving jersey number"
        ).catch(() => {
          // Non-fatal — the check-in itself already succeeded; a jersey number can still be set later by the captain.
        });
      }

      setResult({ status: "admin_review" });
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong submitting your check-in.");
      setResult({ status: "error" });
      setStep("result");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }} keyboardShouldPersistTaps="handled">
      {step === "confirm" && (
        <View>
          <Text style={styles.h1}>Is this you?</Text>
          <View style={styles.infoCard}>
            <Row label="Name" value={membership?.playerName ?? profile?.displayName ?? ""} />
            <Row label="Category" value={categoryLabelFor(categoryId)} />
            <Row label="Waiver" value="Signed at registration ✓" />
          </View>

          <PrimaryButton
            onPress={() => setStep(asksFieldPreference ? "fieldPref" : "consent")}
            style={{ width: "100%" }}
          >
            YES, THAT'S ME
          </PrimaryButton>
        </View>
      )}

      {step === "fieldPref" && (
        <View>
          <Text style={styles.h1}>One more question</Text>
          <Text style={styles.sub}>Would your team like your games scheduled on the private field?</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, marginTop: 8 }}>
            <RoleCard icon="🔒" label="Yes, private field" active={privateFieldPreference === true} onPress={() => setPrivateFieldPreference(true)} />
            <RoleCard icon="🌐" label="No preference" active={privateFieldPreference === false} onPress={() => setPrivateFieldPreference(false)} />
          </View>
          <PrimaryButton disabled={privateFieldPreference === null} onPress={() => setStep("consent")} style={{ width: "100%" }}>
            CONTINUE
          </PrimaryButton>
        </View>
      )}

      {step === "consent" && (
        <View>
          <Text style={styles.h1}>Who's checking in?</Text>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, marginTop: 8 }}>
            <RoleCard icon="🧑" label="I'm 18+, checking in for myself" active={acceptedBy === "self"} onPress={() => setAcceptedBy("self")} />
            <RoleCard icon="👨‍👩‍👧" label="I'm a parent/guardian, for a minor" active={acceptedBy === "guardian"} onPress={() => setAcceptedBy("guardian")} />
          </View>

          {acceptedBy === "guardian" && (
            <TextInput
              placeholder="Parent/guardian full name"
              value={guardianName}
              onChangeText={setGuardianName}
              style={styles.input}
            />
          )}

          <PrimaryButton disabled={!canContinueFromConsent} onPress={() => setStep("details")} style={{ width: "100%", marginTop: 8 }}>CONTINUE</PrimaryButton>
        </View>
      )}

      {step === "details" && (
        <View>
          <Text style={styles.h1}>A couple more details</Text>

          <Text style={{ fontWeight: "700", fontSize: 13.5, marginBottom: 6 }}>Jersey number <Text style={styles.optionalTag}>optional</Text></Text>
          {rosterInfo?.jerseyNumber != null ? (
            <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
              #{rosterInfo.jerseyNumber} — set by your captain/manager.
            </Text>
          ) : jerseyNumbersLocked ? (
            <Text style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
              Jersey numbers are locked now that the tournament has started — ask your team's captain/manager.
            </Text>
          ) : (
            <>
              <TextInput
                keyboardType="number-pad"
                placeholder="e.g. 7 — leave blank if you don't know it yet (optional)"
                value={jerseyNumberDraft}
                onChangeText={(t) => setJerseyNumberDraft(t.replace(/[^0-9]/g, "").slice(0, 3))}
                style={styles.input}
              />
              <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: -6, marginBottom: 16 }}>
                This locks in for the whole tournament once it starts — your captain/manager can also set/fix it before then.
              </Text>
            </>
          )}

          {acceptedBy === "self" && (
            <>
              <Text style={{ fontWeight: "700", fontSize: 13.5, marginBottom: 6 }}>Profession <Text style={styles.optionalTag}>optional</Text></Text>
              {profession ? (
                <View style={styles.professionChipRow}>
                  <View style={styles.professionChip}>
                    <Text style={styles.professionChipText}>{profession}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setProfession(""); setProfessionQuery(""); }}>
                    <Text style={{ color: theme.color.purple, fontWeight: "700", fontSize: 12.5 }}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    placeholder="Search professions… e.g. Nurse"
                    value={professionQuery}
                    onChangeText={setProfessionQuery}
                    style={styles.input}
                  />
                  {professionQuery.trim().length > 0 && (() => {
                    const matches = PROFESSIONS.filter((p) => p.toLowerCase().includes(professionQuery.trim().toLowerCase())).slice(0, 8);
                    return (
                      <View style={styles.professionList}>
                        {matches.map((p) => (
                          <TouchableOpacity key={p} onPress={() => { setProfession(p); setProfessionQuery(""); }} style={styles.professionRow}>
                            <Text style={{ fontSize: 13.5 }}>{p}</Text>
                          </TouchableOpacity>
                        ))}
                        {matches.length === 0 && (
                          <Text style={{ color: theme.color.textMuted, fontSize: 12.5, padding: 10 }}>No match — try a different search.</Text>
                        )}
                      </View>
                    );
                  })()}
                </>
              )}
              <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 8, marginBottom: 16 }}>
                Shown on your Player Card if you share it — never required.
              </Text>
            </>
          )}

          <PrimaryButton disabled={!canContinueFromDetails} onPress={() => setStep("selfie")} style={{ width: "100%" }}>
            CONTINUE
          </PrimaryButton>
        </View>
      )}

      {step === "selfie" && (
        <View>
          <Text style={styles.h1}>Take a selfie</Text>
          <Text style={styles.sub}>Staff match it to your Tournament Pass at the gate.</Text>
          {selfieUri ? <Image source={{ uri: selfieUri }} style={styles.preview} /> : <PrimaryButton onPress={() => capture(setSelfieUri)} style={{ marginBottom: 12 }}>📷 TAKE SELFIE</PrimaryButton>}
          <PrimaryButton disabled={!selfieUri} onPress={() => setStep("govid")} style={{ width: "100%" }}>LOOKS GOOD — CONTINUE</PrimaryButton>
        </View>
      )}

      {step === "govid" && (
        <View>
          <Text style={styles.h1}>Government-issued ID</Text>
          <Text style={styles.sub}>For age verification only.</Text>
          {govIdUri ? <Image source={{ uri: govIdUri }} style={styles.preview} /> : <PrimaryButton onPress={() => capture(setGovIdUri)} style={{ marginBottom: 12 }}>📷 TAKE PHOTO OF ID</PrimaryButton>}
          <PrimaryButton disabled={!govIdUri} onPress={submit} style={{ width: "100%" }}>SUBMIT FOR STAFF REVIEW</PrimaryButton>
        </View>
      )}

      {step === "submitting" && (
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          <Text style={{ fontWeight: "700", fontSize: 16 }}>{submitStatus}</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginTop: 8, textAlign: "center" }}>
            This can take a minute on a slow connection — hang tight.
          </Text>
        </View>
      )}

      {step === "result" && result && (
        <View style={{ alignItems: "center", paddingTop: 20 }}>
          {result.status === "approved" ? (
            <>
              <Text style={{ fontSize: 40 }}>✓</Text>
              <Text style={styles.h1}>You're verified!</Text>
              {pass?.qrPayload ? (
                <View style={styles.qrBox}><Text style={{ fontSize: 11, color: theme.color.textMuted }}>{pass.passId}</Text></View>
              ) : (
                <Text style={{ color: theme.color.warning, fontWeight: "700", marginTop: 10 }}>PENDING REVIEW</Text>
              )}
            </>
          ) : result.status === "admin_review" ? (
            <>
              <Text style={{ fontSize: 40 }}>⏳</Text>
              <Text style={styles.h1}>Pending review</Text>
              <Text style={styles.sub}>A staff member will review your photos and ID, usually within the hour.</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 40 }}>✕</Text>
              <Text style={styles.h1}>We couldn't submit your check-in</Text>
              <Text style={styles.sub}>{error ?? "Something went wrong — please try again."}</Text>
              {/* Photos already taken are kept — no need to retake a perfectly good selfie/ID just because a slow connection timed out. */}
              <PrimaryButton onPress={submit} style={{ marginTop: 16, width: "100%" }}>
                TRY AGAIN
              </PrimaryButton>
              <TouchableOpacity onPress={() => { setStep("selfie"); setSelfieUri(null); setGovIdUri(null); }} style={{ marginTop: 12 }}>
                <Text style={{ color: theme.color.textMuted, fontWeight: "600", fontSize: 12.5 }}>Retake photos instead</Text>
              </TouchableOpacity>
            </>
          )}

          {(result.status === "approved" || result.status === "admin_review") && !hasVolunteerApplication && (
            <TouchableOpacity onPress={() => setVolunteerSignupOpen(true)} style={{ marginTop: 20 }}>
              <Text style={{ color: theme.color.purple, fontWeight: "700", fontSize: 13 }}>Want to help out too? SIGN UP TO VOLUNTEER</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {volunteerSignupOpen && (
        <VolunteerSignupModal onClose={() => setVolunteerSignupOpen(false)} initialName={membership?.playerName ?? profile?.displayName} />
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: theme.color.textMuted }}>{label}</Text>
      <Text style={{ fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function RoleCard({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.roleCard, active && styles.roleCardActive]}>
      <Text style={{ fontSize: 28, marginBottom: 6 }}>{icon}</Text>
      <Text style={styles.roleCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  h1: { fontWeight: "800", fontSize: 20, marginBottom: 8, textAlign: "center" },
  sub: { color: theme.color.textMuted, fontSize: 13, marginBottom: 14, textAlign: "center" },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginVertical: 14 },
  preview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 14 },
  qrBox: { width: 160, height: 160, backgroundColor: theme.color.navy, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 14 },
  input: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5, marginBottom: 12, backgroundColor: "#fff" },
  optionalTag: { fontSize: 10.5, fontWeight: "600", color: theme.color.textMuted, textTransform: "uppercase" },
  professionChipRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  professionChip: { backgroundColor: "#F1EFF5", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, flexShrink: 1 },
  professionChipText: { fontSize: 13.5, fontWeight: "700", color: theme.color.text },
  professionList: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, backgroundColor: "#fff", marginTop: -6, marginBottom: 12, overflow: "hidden" },
  professionRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.color.border },
  roleCard: { flex: 1, alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 2, borderColor: theme.color.border, backgroundColor: "#fff" },
  roleCardActive: { borderColor: theme.color.purple, backgroundColor: "#F1EFF5" },
  roleCardLabel: { fontSize: 12, fontWeight: "700", textAlign: "center" },
});
