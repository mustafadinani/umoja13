import { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CATEGORIES, type PlayerMembership } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useGames, useTeam, useMyVolunteerTasks, useMyVolunteerApplications } from "../hooks/useData";
import { Card, Pill, PrimaryButton } from "../components/ui";
import { JoinTeamModal } from "../components/JoinTeamModal";
import { CaptainComplaintModal } from "../components/CaptainComplaintModal";
import { VolunteerSignupModal } from "../components/VolunteerSignupModal";
import { VolunteerTaskDetailModal } from "../components/VolunteerTaskDetailModal";

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

  // One parent account can hold memberships for several kids — group by
  // whichever name each membership was joined under, so each kid gets their
  // own tab instead of everything stacking under one flat list. "You" is
  // always offered as the first tab too, since the account holder might
  // play themselves or want to volunteer as themselves rather than as one
  // of the kids.
  const selfName = (profile?.displayName ?? "Player").trim();
  const kidGroups = useMemo(() => {
    const groups = new Map<string, PlayerMembership[]>();
    for (const m of memberships) {
      const key = (m.playerName ?? profile?.displayName ?? "Player").trim();
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    return groups;
  }, [memberships, profile?.displayName]);
  const kidOnlyNames = [...kidGroups.keys()].filter((n) => n !== selfName);
  const tabNames = ["You", ...kidOnlyNames];
  const selectedTab = activeKid && tabNames.includes(activeKid) ? activeKid : tabNames[0];
  const selectedKid = selectedTab === "You" ? selfName : selectedTab;
  const activeMemberships = kidGroups.get(selectedKid) ?? [];

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
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("AskUmoja")} style={{ marginRight: 14 }}>
          <Text style={{ fontSize: 20 }}>🤖</Text>
        </TouchableOpacity>
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
          {tabNames.length > 1 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
              {tabNames.map((name) => (
                <Pill key={name} active={selectedTab === name} onPress={() => setActiveKid(name)}>{name === "You" ? "You" : firstName(name)}</Pill>
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
        <VolunteerSection uid={user?.uid} activeKidName={selectedKid} onSignup={() => setVolunteerSignupOpen(true)} />
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

/**
 * Whether "Sign up to volunteer" / an application's status / the shift list
 * shows is decided per active tab name, not by the account's overall
 * volunteer role — otherwise once any one kid's application is approved,
 * every other tab loses the ability to sign up separately.
 */
function VolunteerSection({
  uid, activeKidName, onSignup,
}: {
  uid: string | undefined; activeKidName: string; onSignup: () => void;
}) {
  const { data: allTasks } = useMyVolunteerTasks(uid);
  const { data: allApplications } = useMyVolunteerApplications(uid);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const tasks = allTasks.filter((t) => (t.assigneeName ?? "").trim() === activeKidName.trim());
  const myApplication = allApplications
    .filter((a) => a.name.trim() === activeKidName.trim())
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  if (tasks.length === 0 && myApplication?.status === "pending") {
    return (
      <Card>
        <Text style={{ fontWeight: "700", marginBottom: 4 }}>Application submitted</Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>
          An organizer will review {firstName(activeKidName)}'s application and follow up with shifts.
        </Text>
      </Card>
    );
  }

  if (tasks.length === 0 && (!myApplication || myApplication.status === "rejected")) {
    return (
      <Card>
        <Text style={{ fontWeight: "700", marginBottom: 4 }}>Become a Volunteer</Text>
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 12 }}>
          Help us run Umoja Games — setup, check-in support, water/shade, pack-down, and more.
        </Text>
        <PrimaryButton onPress={onSignup}>SIGN UP TO VOLUNTEER</PrimaryButton>
      </Card>
    );
  }

  return (
    <>
      {tasks.map((t) => (
        <Card key={t.id} onPress={() => setOpenTaskId(t.id)} style={{ marginBottom: 8 }}>
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
        </Card>
      ))}
      {tasks.length === 0 && (
        <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 12 }}>
          No shifts assigned to {firstName(activeKidName)} yet — check back soon.
        </Text>
      )}

      {openTask && <VolunteerTaskDetailModal task={openTask} onClose={() => setOpenTaskId(null)} />}
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
