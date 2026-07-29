import { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { doc, updateDoc } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, type PlayerMembership, type VolunteerTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames, useTeam, useMyVolunteerTasks } from "../hooks/useData";
import { Card, Pill, PrimaryButton } from "../components/ui";
import { JoinTeamModal } from "../components/JoinTeamModal";
import { CaptainComplaintModal } from "../components/CaptainComplaintModal";
import { VolunteerSignupModal } from "../components/VolunteerSignupModal";
import { RoleChannelPanel } from "../components/RoleChannelPanel";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function MyUmojaScreen({ navigation }: BottomTabScreenProps<any>) {
  const { user, profile, signOut } = useAuth();
  const { data: games } = useGames();
  const [joinOpen, setJoinOpen] = useState(false);
  const [complaintTeamId, setComplaintTeamId] = useState<string | null>(null);
  const [volunteerSignupOpen, setVolunteerSignupOpen] = useState(false);
  const [activeKid, setActiveKid] = useState<string | null>(null);
  const memberships = profile?.playerOf ?? [];
  const isVolunteer = profile?.roles?.includes("volunteer") ?? false;

  // One parent account can hold memberships for several kids — group by
  // whichever name each membership was joined under, so each kid gets their
  // own tab instead of everything stacking under one flat list.
  const kidGroups = useMemo(() => {
    const groups = new Map<string, PlayerMembership[]>();
    for (const m of memberships) {
      const key = (m.playerName ?? profile?.displayName ?? "Player").trim();
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    return groups;
  }, [memberships, profile?.displayName]);
  const kidNames = [...kidGroups.keys()];
  const selectedKid = activeKid && kidGroups.has(activeKid) ? activeKid : kidNames[0];
  const activeMemberships = kidGroups.get(selectedKid ?? "") ?? [];

  const myTeamIds = new Set(activeMemberships.map((m) => m.teamId));
  const myGames = games.filter((g) => myTeamIds.has(g.homeTeamId) || myTeamIds.has(g.awayTeamId));
  const captainMemberships = activeMemberships.filter((m) => m.isCaptain);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={{ color: "#fff", fontWeight: "800" }}>{profile?.displayName?.slice(0, 2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 17 }}>{profile?.displayName}</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 12 }}>{profile?.primaryRole}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("MessageOrganizers")} style={{ marginRight: 14 }}>
          <Text style={{ fontSize: 20 }}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Notifications")}><Text style={{ fontSize: 20 }}>🔔</Text></TouchableOpacity>
      </View>

      {memberships.length === 0 ? (
        <View style={styles.section}>
          <Card>
            <Text style={{ fontWeight: "700", marginBottom: 6 }}>Not on a roster yet</Text>
            <PrimaryButton onPress={() => setJoinOpen(true)}>JOIN A TEAM</PrimaryButton>
          </Card>
        </View>
      ) : (
        <>
          {kidNames.length > 1 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
              {kidNames.map((name) => (
                <Pill key={name} active={selectedKid === name} onPress={() => setActiveKid(name)}>{firstName(name)}</Pill>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TOURNAMENT PASS</Text>
            {activeMemberships.map((m) => (
              <Card key={m.teamId} onPress={() => navigation.getParent()?.navigate("CheckIn", { teamId: m.teamId, categoryId: m.categoryId })} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: "700" }}>{CATEGORIES.find((c) => c.id === m.categoryId)?.label ?? m.categoryId}</Text>
                <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>Tap to check in / view pass</Text>
              </Card>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY TEAMS</Text>
            {activeMemberships.map((m) => <TeamRow key={m.teamId} teamId={m.teamId} onPress={() => navigation.getParent()?.navigate("Team", { teamId: m.teamId })} />)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY GAMES</Text>
            {myGames.map((g) => (
              <Card key={g.id} onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })} style={{ marginBottom: 6 }}>
                <Text style={{ fontWeight: "600" }}>{g.day.toUpperCase()} · {g.field} · {g.kickoffTime}</Text>
              </Card>
            ))}
            {myGames.length === 0 && <Text style={{ color: theme.color.textMuted }}>No games scheduled yet.</Text>}
          </View>

          {captainMemberships.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CAPTAIN TOOLS</Text>
              {captainMemberships.map((m) => (
                <CaptainComplaintRow key={m.teamId} teamId={m.teamId} onPress={() => setComplaintTeamId(m.teamId)} />
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VOLUNTEER</Text>
        {isVolunteer ? (
          <VolunteerShifts uid={user?.uid} />
        ) : (
          <Card>
            <Text style={{ fontWeight: "700", marginBottom: 4 }}>Become a Volunteer</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 12 }}>
              Help us run Umoja Games — setup, check-in support, water/shade, pack-down, and more.
            </Text>
            <PrimaryButton onPress={() => setVolunteerSignupOpen(true)}>SIGN UP TO VOLUNTEER</PrimaryButton>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Card onPress={() => navigation.getParent()?.navigate("Complaint")}>
          <Text style={{ fontWeight: "600" }}>Report an issue to the commissioner</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={{ color: theme.color.danger, fontWeight: "700", textAlign: "center" }}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {joinOpen && <JoinTeamModal onClose={() => setJoinOpen(false)} />}
      {complaintTeamId && <CaptainComplaintTeamWrapper teamId={complaintTeamId} onClose={() => setComplaintTeamId(null)} />}
      {volunteerSignupOpen && (
        <VolunteerSignupModal onClose={() => setVolunteerSignupOpen(false)} initialName={selectedKid ?? undefined} />
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VolunteerShifts({ uid }: { uid: string | undefined }) {
  const { data: tasks } = useMyVolunteerTasks(uid);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"shifts" | "channel">("shifts");

  async function markDone(task: VolunteerTask) {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), { done: !task.done });
  }

  async function flagCantMake(task: VolunteerTask) {
    const reason = reasonDrafts[task.id] ?? "";
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), {
      cantMake: !task.cantMake,
      cantMakeReason: !task.cantMake ? reason : "",
    });
  }

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Pill active={tab === "shifts"} onPress={() => setTab("shifts")}>My Shifts</Pill>
        <Pill active={tab === "channel"} onPress={() => setTab("channel")}>Channel</Pill>
      </View>

      {tab === "channel" ? (
        <RoleChannelPanel role="volunteer" />
      ) : (
      <>
      {tasks.map((t) => (
        <Card key={t.id} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 14 }}>{t.title}</Text>
              <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>{t.time} · {t.location}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {t.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
              {t.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => markDone(t)}
              style={{ borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700" }}>{t.done ? "Mark not done" : "Mark done"}</Text>
            </TouchableOpacity>
            {!t.cantMake && (
              <TextInput
                placeholder="Reason (optional)"
                value={reasonDrafts[t.id] ?? ""}
                onChangeText={(v) => setReasonDrafts((prev) => ({ ...prev, [t.id]: v }))}
                style={{ flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 12.5 }}
              />
            )}
            <TouchableOpacity
              onPress={() => flagCantMake(t)}
              style={{
                borderWidth: 1,
                borderColor: theme.color.border,
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 10,
                backgroundColor: t.cantMake ? theme.color.dangerBg : "transparent",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.cantMake ? theme.color.danger : theme.color.text }}>
                {t.cantMake ? "I can make it after all" : "Can't make it"}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
      {tasks.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 12 }}>No shifts assigned to you yet — check back soon.</Text>}
      </>
      )}
    </>
  );
}

function TeamRow({ teamId, onPress }: { teamId: string; onPress: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <Card onPress={onPress} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontWeight: "700", color: team.color }}>{team.name}</Text>
      <Text style={{ color: theme.color.textMuted }}>#{team.stats.groupRank ?? "—"} · {team.stats.points} pts</Text>
    </Card>
  );
}

function CaptainComplaintRow({ teamId, onPress }: { teamId: string; onPress: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return (
    <Card onPress={onPress} style={{ marginBottom: 6 }}>
      <Text style={{ fontWeight: "600" }}>File a complaint — {team.name}</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>$35 review fee, refunded if upheld</Text>
    </Card>
  );
}

function CaptainComplaintTeamWrapper({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { data: team } = useTeam(teamId);
  if (!team) return null;
  return <CaptainComplaintModal teamName={team.name} onClose={onClose} />;
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 12, backgroundColor: theme.color.purple, alignItems: "center", justifyContent: "center" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 8 },
});
