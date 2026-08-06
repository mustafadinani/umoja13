import { useMemo, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  VENUE,
  SPONSOR_TIER_ORDER,
  SPONSOR_TIER_LABELS,
  CATEGORIES,
  type Sponsor,
  type PlayerMembership,
} from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme, heroGradient, hunterGradient } from "../lib/theme";
import {
  useAnnouncements,
  useGames,
  useMoments,
  useSponsors,
  useTeams,
  useTeam,
  useMyVolunteerTasks,
  useMyVolunteerApplications,
} from "../hooks/useData";
import { Card, Modal, Pill, PrimaryButton } from "../components/ui";
import { SponsorshipCheckoutModal } from "../components/SponsorshipCheckoutModal";
import { MomentDetailModal } from "../components/MomentDetailModal";
import { LoadingImage } from "../components/LoadingImage";
import { CheckInCard } from "../components/CheckInCard";
import { JoinTeamModal } from "../components/JoinTeamModal";
import { CaptainComplaintModal } from "../components/CaptainComplaintModal";
import { VolunteerSignupModal } from "../components/VolunteerSignupModal";
import { VolunteerTaskDetailModal } from "../components/VolunteerTaskDetailModal";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Home now carries what My Umoja used to — check-in, teams, games, captain
 * tools, volunteer shifts — folded in under a per-kid pill switcher, right
 * below the same hero and live-score banner Home always had. My Umoja no
 * longer exists as its own tab; its old real estate became the Hub tab
 * instead (Pods/Experiences/Field Map — see HubScreen).
 */
export function HomeScreen({ navigation }: BottomTabScreenProps<any>) {
  const { user, profile, signOut } = useAuth();
  const isReferee = profile?.roles?.includes("referee") ?? false;
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const { data: moments } = useMoments();
  const { data: announcements } = useAnnouncements();
  const { data: sponsors } = useSponsors();
  const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
  const [sponsorCheckoutOpen, setSponsorCheckoutOpen] = useState(false);
  const [openSponsor, setOpenSponsor] = useState<Sponsor | null>(null);
  const [openMomentId, setOpenMomentId] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [complaintTeamId, setComplaintTeamId] = useState<string | null>(null);
  const [volunteerSignupOpen, setVolunteerSignupOpen] = useState(false);
  const [activeKid, setActiveKid] = useState<string | null>(null);
  const openAnnouncement = announcements.find((a) => a.id === openAnnouncementId) ?? null;
  const openMoment = moments.find((m) => m.id === openMomentId) ?? null;
  const visibleSponsors = sponsors.filter((s) => s.visible ?? true);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const liveGame = games.find((g) => g.status === "live");
  const upNext = games.filter((g) => g.status === "scheduled").slice(0, 3);

  // One parent account can hold memberships for several kids — grouped by
  // whichever name each membership was joined under. "You" is always the
  // first tab too, in case the account holder plays or volunteers themselves.
  const memberships = profile?.playerOf ?? [];
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
      <LinearGradient colors={heroGradient} style={styles.hero}>
        <View style={styles.heroIcons}>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate("AskUmoja")}><Text style={styles.heroIcon}>🤖</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate("MessageOrganizers")}><Text style={styles.heroIcon}>💬</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Notifications")}><Text style={styles.heroIcon}>🔔</Text></TouchableOpacity>
        </View>
        <View style={styles.heroTop}>
          <Image source={require("../../assets/logo-icon.png")} style={styles.heroLogo} resizeMode="contain" />
          <Text style={styles.heroKicker}>{VENUE.name.toUpperCase()} · {VENUE.dates.toUpperCase()}</Text>
        </View>
        <Text style={styles.heroTitle}>UNITED WE STAND.{"\n"}TOGETHER WE WIN.</Text>
        <Text style={styles.heroSub}>Good morning, {profile?.displayName?.split(" ")[0] ?? "there"}.</Text>
      </LinearGradient>

      {liveGame && (
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Game", { gameId: liveGame.id })} activeOpacity={0.8}>
          <View style={styles.liveCard}>
            <Text style={styles.liveLabel}>● LIVE · {liveGame.field}</Text>
            <View style={styles.liveScoreRow}>
              <Text style={styles.liveTeam}>{teamById.get(liveGame.homeTeamId)?.name ?? "TBD"}</Text>
              <Text style={styles.liveScore}>
                {liveGame.homeScore ?? 0}
                {" – "}
                {liveGame.awayScore ?? 0}
              </Text>
              <Text style={styles.liveTeam}>{teamById.get(liveGame.awayTeamId)?.name ?? "TBD"}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

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
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginTop: 14, marginBottom: 6 }}>
              {tabNames.map((name) => (
                <Pill key={name} active={selectedTab === name} onPress={() => setActiveKid(name)}>{name === "You" ? "👑 You" : firstName(name)}</Pill>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHECK-IN</Text>
            {user &&
              (() => {
                const valid = activeMemberships.filter((m) => CATEGORIES.some((c) => c.id === m.categoryId));
                if (valid.length > 0) {
                  return valid.map((m) => (
                    <CheckInCard
                      key={`${m.teamId}-${m.categoryId}`}
                      uid={user.uid}
                      membership={m}
                      onCheckIn={() => navigation.getParent()?.navigate("CheckIn", { teamId: m.teamId, categoryId: m.categoryId })}
                    />
                  ));
                }
                if (activeMemberships.length > 0) {
                  return (
                    <Card style={{ marginBottom: 8 }}>
                      <Text style={{ fontWeight: "700" }}>Registration issue</Text>
                      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                        We found a registration but ran into an issue matching it to a tournament category. Please contact Umoja so we can correct it.
                      </Text>
                    </Card>
                  );
                }
                return null;
              })()}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VOLUNTEER</Text>
            <VolunteerSection uid={user?.uid} activeKidName={selectedKid} onSignup={() => setVolunteerSignupOpen(true)} />
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>UP NEXT</Text>
        {upNext.map((g) => (
          <Card key={g.id} onPress={() => navigation.getParent()?.navigate("Game", { gameId: g.id })} style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: "600" }}>{teamById.get(g.homeTeamId)?.name ?? "TBD"} vs {teamById.get(g.awayTeamId)?.name ?? "TBD"}</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 2 }}>{g.field} · {g.kickoffTime}</Text>
          </Card>
        ))}
        {upNext.length === 0 && <Text style={{ color: theme.color.textMuted }}>No upcoming games yet.</Text>}
      </View>

      {!isReferee && (
        <TouchableOpacity onPress={() => navigation.navigate("Hunt")} activeOpacity={0.85}>
          <LinearGradient colors={hunterGradient} style={styles.huntTile}>
            <Text style={styles.huntTitle}>THE HUNT · WIN $500</Text>
            <Text style={styles.huntSub}>45 missions around the plex →</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>FRESH MOMENTS</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Moments")}>
            <Text style={{ color: theme.color.blue, fontWeight: "700", fontSize: 12.5 }}>See all →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {moments.slice(0, 5).map((m) => (
            <TouchableOpacity key={m.id} onPress={() => setOpenMomentId(m.id)} activeOpacity={0.85}>
              {m.mediaUrl && m.mediaType !== "video" ? (
                <LoadingImage source={{ uri: m.mediaUrl }} style={styles.momentTile} />
              ) : (
                <View style={[styles.momentTile, m.mediaType === "video" ? styles.momentTileVideo : null]}>
                  {m.mediaType === "video" && <Text style={{ fontSize: 18 }}>▶</Text>}
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>{m.source.toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {moments.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>No moments yet — be the first to share one.</Text>}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ANNOUNCEMENTS</Text>
        {announcements.slice(0, 3).map((a) => (
          <TouchableOpacity key={a.id} onPress={() => setOpenAnnouncementId(a.id)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.color.border }}>
            <Text style={{ fontWeight: "600" }}>{a.title}</Text>
            <Text style={{ color: theme.color.blue, fontSize: 12, fontWeight: "600", marginTop: 2 }}>Read more</Text>
          </TouchableOpacity>
        ))}
        {announcements.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>No announcements yet.</Text>}
      </View>

      <View style={styles.section}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>SPONSORS</Text>
          <TouchableOpacity onPress={() => setSponsorCheckoutOpen(true)}>
            <Text style={{ color: theme.color.blue, fontWeight: "700", fontSize: 12.5 }}>Become a Sponsor →</Text>
          </TouchableOpacity>
        </View>
        {SPONSOR_TIER_ORDER.map((tier) => {
          const tierSponsors = visibleSponsors.filter((s) => (s.tier ?? "community_supporter") === tier).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          if (tierSponsors.length === 0) return null;
          return (
            <View key={tier} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.color.textMuted, marginBottom: 6 }}>{SPONSOR_TIER_LABELS[tier].toUpperCase()}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {tierSponsors.map((s) => (
                  <TouchableOpacity key={s.id} style={styles.sponsorChip} onPress={() => setOpenSponsor(s)} activeOpacity={0.7}>
                    {s.logoUrl && <Image source={{ uri: s.logoUrl }} style={{ width: 22, height: 22, borderRadius: 4, marginRight: 8 }} resizeMode="contain" />}
                    <Text style={{ fontWeight: "700", fontSize: 13 }}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
        {visibleSponsors.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>No sponsors yet — be the first!</Text>}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Complaint")}>
          <Text style={styles.footerLink}>Report an issue to the commissioner</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => signOut()} style={{ marginTop: 12 }}>
          <Text style={styles.footerSignOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!openAnnouncement} onClose={() => setOpenAnnouncementId(null)}>
        {openAnnouncement && (
          <View>
            <Text style={{ fontWeight: "800", fontSize: 19 }}>{openAnnouncement.title}</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 12, marginVertical: 8 }}>
              {new Date(openAnnouncement.postedAt).toLocaleString()}
            </Text>
            <Text style={{ fontSize: 14.5, lineHeight: 21 }}>{openAnnouncement.body}</Text>
          </View>
        )}
      </Modal>
      <Modal visible={!!openSponsor} onClose={() => setOpenSponsor(null)}>
        {openSponsor && (
          <View>
            {openSponsor.logoUrl && <Image source={{ uri: openSponsor.logoUrl }} style={{ width: "100%", height: 70, marginBottom: 12 }} resizeMode="contain" />}
            <Text style={{ fontWeight: "800", fontSize: 20 }}>{openSponsor.name}</Text>
            {openSponsor.tagline && <Text style={{ color: theme.color.textMuted, fontSize: 13, marginTop: 4, marginBottom: 12 }}>{openSponsor.tagline}</Text>}
            {openSponsor.story && <Text style={{ fontSize: 14.5, lineHeight: 21, marginBottom: openSponsor.websiteUrl ? 16 : 0 }}>{openSponsor.story}</Text>}
            {openSponsor.websiteUrl && (
              <PrimaryButton style={{ width: "100%" }} onPress={() => Linking.openURL(openSponsor.websiteUrl!)}>VISIT WEBSITE</PrimaryButton>
            )}
          </View>
        )}
      </Modal>
      {sponsorCheckoutOpen && <SponsorshipCheckoutModal onClose={() => setSponsorCheckoutOpen(false)} />}
      <MomentDetailModal moment={openMoment} onClose={() => setOpenMomentId(null)} />
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
  hero: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  heroIcons: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginBottom: 10 },
  heroIcon: { fontSize: 18, opacity: 0.92 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  heroLogo: { width: 24, height: 24 },
  heroKicker: { color: "#fff", opacity: 0.85, fontWeight: "700", fontSize: 11, letterSpacing: 1 },
  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 28, lineHeight: 32 },
  heroSub: { color: "#fff", opacity: 0.9, marginTop: 10, fontSize: 14 },
  liveCard: { backgroundColor: theme.color.navy, margin: 16, marginTop: -16, borderRadius: theme.radius.lg, padding: 16 },
  liveLabel: { color: theme.color.gold, fontWeight: "700", fontSize: 12 },
  liveScoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 },
  liveTeam: { color: "#fff", fontWeight: "600", fontSize: 13, flex: 1 },
  liveScore: { color: "#fff", fontWeight: "800", fontSize: 28 },
  section: { padding: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10, color: theme.color.text },
  huntTile: { marginHorizontal: 16, marginTop: 4, borderRadius: theme.radius.lg, padding: 18 },
  huntTitle: { color: "#fff", fontWeight: "800", fontSize: 17 },
  huntSub: { color: "#fff", opacity: 0.9, marginTop: 4, fontSize: 13 },
  momentTile: { width: 100, height: 70, borderRadius: 10, backgroundColor: theme.color.purple, marginRight: 8, alignItems: "center", justifyContent: "center" },
  momentTileVideo: { backgroundColor: theme.color.navy },
  sponsorChip: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
  footer: { paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" },
  footerLink: { color: theme.color.textMuted, fontWeight: "600", fontSize: 13 },
  footerSignOut: { color: theme.color.danger, fontWeight: "700", fontSize: 13 },
});
