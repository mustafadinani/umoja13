import { useMemo, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { VENUE, SPONSOR_TIER_ORDER, SPONSOR_TIER_LABELS, type Sponsor } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme, heroGradient, hunterGradient } from "../lib/theme";
import { useAnnouncements, useGames, useMoments, useSponsors, useTeams } from "../hooks/useData";
import { Card, Modal, PrimaryButton } from "../components/ui";
import { SponsorshipCheckoutModal } from "../components/SponsorshipCheckoutModal";
import { MomentDetailModal } from "../components/MomentDetailModal";
import { LoadingImage } from "../components/LoadingImage";

export function HomeScreen({ navigation }: BottomTabScreenProps<any>) {
  const { profile } = useAuth();
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
  const openAnnouncement = announcements.find((a) => a.id === openAnnouncementId) ?? null;
  const openMoment = moments.find((m) => m.id === openMomentId) ?? null;
  const visibleSponsors = sponsors.filter((s) => s.visible ?? true);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const liveGame = games.find((g) => g.status === "live");
  const upNext = games.filter((g) => g.status === "scheduled").slice(0, 3);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <LinearGradient colors={heroGradient} style={styles.hero}>
        <Image source={require("../../assets/logo-icon.png")} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.heroKicker}>{VENUE.name.toUpperCase()} · {VENUE.dates.toUpperCase()}</Text>
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

      <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Info")} activeOpacity={0.85}>
        <Card style={styles.infoTile}>
          <Text style={{ fontWeight: "700", fontSize: 14 }}>EVENT INFO</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginTop: 2 }}>FAQ, venue map & logistics, things to do nearby →</Text>
        </Card>
      </TouchableOpacity>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 28, paddingHorizontal: 20 },
  heroLogo: { position: "absolute", top: 54, right: 20, width: 48, height: 48 },
  heroKicker: { color: "#fff", opacity: 0.85, fontWeight: "700", fontSize: 11, letterSpacing: 1 },
  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 28, marginTop: 8, lineHeight: 32 },
  heroSub: { color: "#fff", opacity: 0.9, marginTop: 10, fontSize: 14 },
  liveCard: { backgroundColor: theme.color.navy, margin: 16, marginTop: -16, borderRadius: theme.radius.lg, padding: 16 },
  liveLabel: { color: theme.color.gold, fontWeight: "700", fontSize: 12 },
  liveScoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 10 },
  liveTeam: { color: "#fff", fontWeight: "600", fontSize: 13, flex: 1 },
  liveScore: { color: "#fff", fontWeight: "800", fontSize: 28 },
  section: { padding: 16 },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10, color: theme.color.text },
  huntTile: { marginHorizontal: 16, borderRadius: theme.radius.lg, padding: 18 },
  infoTile: { marginHorizontal: 16, marginTop: 12 },
  huntTitle: { color: "#fff", fontWeight: "800", fontSize: 17 },
  huntSub: { color: "#fff", opacity: 0.9, marginTop: 4, fontSize: 13 },
  momentTile: { width: 100, height: 70, borderRadius: 10, backgroundColor: theme.color.purple, marginRight: 8, alignItems: "center", justifyContent: "center" },
  momentTileVideo: { backgroundColor: theme.color.navy },
  sponsorChip: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.color.border, backgroundColor: "#fff" },
});
