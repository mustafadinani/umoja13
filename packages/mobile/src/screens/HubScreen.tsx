import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { Pod } from "@umoja/shared";
import {
  UMOJA_FAQ,
  SPECIAL_EVENTS,
  VENUE_LOGISTICS,
  VENUE,
  TRAVEL_GUIDE,
  LOCAL_EXPERIENCES,
  MUSLIM_FAMILY_GUIDE,
} from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMyPods, useMyPodTasks } from "../hooks/useData";
import { listOpenPods, joinPod } from "../lib/callables";
import { openMaps, openPhone } from "../lib/links";
import { Card, Pill, PrimaryButton } from "../components/ui";
import { VolunteerSignupModal } from "../components/VolunteerSignupModal";
import { PodHubModal } from "../components/PodHubModal";
import { PodTaskDetailModal } from "../components/PodTaskDetailModal";
import { PlaceDetailModal, type PlaceDetail } from "../components/PlaceDetailModal";

// Same set ensureInGeneralPod/listOpenPods treat as pod-eligible on the backend.
const POD_ELIGIBLE_ROLES = ["admin", "commissioner", "referee", "volunteer"];

type ExpSeg = "info" | "travel" | "local" | "muslim";

/**
 * "Everything besides the games" — the tab that replaced the old My Umoja
 * slot's leftover real estate once its personal content moved into Home.
 * Two destinations, both with real content, not just a label: your pod(s)
 * and open ones to join, and the four Experiences categories. The field map
 * lives on the Games tab now, next to the schedule it's actually about.
 * Deliberately doesn't carry Message Organizers/Notifications/Report an
 * Issue — those are account-level utility, not "info," and live on Home.
 */
export function HubScreen() {
  const { profile } = useAuth();
  const [volunteerOpen, setVolunteerOpen] = useState(false);
  const eligible = profile?.roles.some((r) => POD_ELIGIBLE_ROLES.includes(r)) ?? false;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.header}>
        <Text style={styles.title}>HUB</Text>
        <Text style={styles.sub}>Everything besides the games — where to help and what to do.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🙋 PODS</Text>
        {eligible ? (
          <>
            <MyPodsSection />
            <MyPodTasksSection />
            <OpenPodsSection />
          </>
        ) : (
          <Card>
            <Text style={{ fontWeight: "700", fontSize: 14.5, marginBottom: 6 }}>Pods are for our volunteer crews</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 19 }}>
              A pod is a small team coordinating one zone of the tournament together — chat, shifts, tasks. Sign up to volunteer and you'll be able to join one yourself.
            </Text>
            <PrimaryButton onPress={() => setVolunteerOpen(true)}>🙋 BECOME A VOLUNTEER</PrimaryButton>
          </Card>
        )}
      </View>

      <View style={[styles.section, styles.sectionGap]}>
        <Text style={styles.sectionTitle}>🌍 EXPERIENCES</Text>
        <ExperiencesSection />
      </View>

      {volunteerOpen && <VolunteerSignupModal onClose={() => setVolunteerOpen(false)} initialName={profile?.displayName} />}
    </ScrollView>
  );
}

function MyPodsSection() {
  const { user } = useAuth();
  const { data: pods } = useMyPods(user?.uid);
  const [openPod, setOpenPod] = useState<Pod | null>(null);
  const sorted = [...pods].sort((a, b) => (a.isGeneral ? 1 : b.isGeneral ? -1 : a.name.localeCompare(b.name)));

  if (sorted.length === 0) {
    return <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 10 }}>Not on a pod yet — join one below.</Text>;
  }

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.subLabel}>MY PODS</Text>
      {sorted.map((p) => (
        <Card key={p.id} onPress={() => setOpenPod(p)} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{p.name}</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 12 }}>{p.memberUids.length} member{p.memberUids.length === 1 ? "" : "s"}</Text>
        </Card>
      ))}
      {openPod && <PodHubModal pod={openPod} onClose={() => setOpenPod(null)} />}
    </View>
  );
}

function formatTaskDueDate(dueDate: string, todayStr: string): string {
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dueDate < todayStr ? `Overdue · was due ${label}` : `Due ${label}`;
}

/** Pod tasks assigned specifically to you, across every pod you're on. Renders nothing if you have no pending tasks. */
function MyPodTasksSection() {
  const { user } = useAuth();
  const { data: tasks } = useMyPodTasks(user?.uid);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const pending = tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });
  const openTask = pending.find((t) => t.id === openTaskId) ?? null;

  if (pending.length === 0) return null;

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.subLabel}>TASKS DUE FROM YOU</Text>
      {pending.map((t) => {
        const isOverdue = !!t.dueDate && t.dueDate < todayStr;
        return (
          <Card key={t.id} onPress={() => setOpenTaskId(t.id)} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{t.title}</Text>
            {!!t.dueDate && (
              <Text style={{ fontSize: 11.5, color: isOverdue ? theme.color.danger : theme.color.textMuted, fontWeight: isOverdue ? "700" : "400" }}>
                {formatTaskDueDate(t.dueDate, todayStr)}
              </Text>
            )}
          </Card>
        );
      })}
      {openTask && <PodTaskDetailModal task={openTask} canPost onClose={() => setOpenTaskId(null)} />}
    </View>
  );
}

function OpenPodsSection() {
  const [pods, setPods] = useState<{ id: string; name: string; memberCount: number }[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOpenPods({})
      .then((res) => setPods(res.data.pods))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load open pods."));
  }, []);

  async function join(podId: string) {
    setBusyId(podId);
    setError(null);
    try {
      await joinPod({ podId });
      setPods((prev) => prev?.filter((p) => p.id !== podId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join this pod.");
    } finally {
      setBusyId(null);
    }
  }

  if (!pods || pods.length === 0) return null;

  return (
    <View>
      <Text style={styles.subLabel}>OPEN PODS</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 8 }}>Join a pod you're not on yet — no approval needed.</Text>
      {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 8 }}>{error}</Text>}
      {pods.map((p) => (
        <Card key={p.id} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{p.name}</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 11.5, marginTop: 1 }}>{p.memberCount} member{p.memberCount === 1 ? "" : "s"}</Text>
          </View>
          <PrimaryButton disabled={busyId === p.id} onPress={() => join(p.id)} style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
            {busyId === p.id ? "…" : "JOIN"}
          </PrimaryButton>
        </Card>
      ))}
    </View>
  );
}

function ExperiencesSection() {
  const [seg, setSeg] = useState<ExpSeg>("info");
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill active={seg === "info"} onPress={() => setSeg("info")}>ℹ️ Info</Pill>
        <Pill active={seg === "travel"} onPress={() => setSeg("travel")}>✈️ Travel</Pill>
        <Pill active={seg === "local"} onPress={() => setSeg("local")}>🎡 Local</Pill>
        <Pill active={seg === "muslim"} onPress={() => setSeg("muslim")}>🌙 Muslim Guide</Pill>
      </View>
      {seg === "info" && <InfoSeg />}
      {seg === "travel" && <TravelSeg />}
      {seg === "local" && <LocalSeg />}
      {seg === "muslim" && <MuslimSeg />}
    </View>
  );
}

function InfoSeg() {
  const [openQ, setOpenQ] = useState<string | null>(null);
  return (
    <View>
      <Text style={styles.p}>
        {VENUE.name} ·{" "}
        <Text style={styles.link} onPress={() => openMaps(VENUE.address)}>{VENUE.address}</Text> · {VENUE.dates}
      </Text>

      <Text style={styles.h3}>FAQ</Text>
      {UMOJA_FAQ.map((f) => {
        const isOpen = openQ === f.q;
        return (
          <Card key={f.q} onPress={() => setOpenQ(isOpen ? null : f.q)} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <Text style={{ fontWeight: "700", fontSize: 13.5, flex: 1 }}>{f.q}</Text>
              <Text style={{ fontSize: 15, color: theme.color.textMuted }}>{isOpen ? "–" : "+"}</Text>
            </View>
            {isOpen && <Text style={{ fontSize: 12.5, color: theme.color.textMuted, lineHeight: 18, marginTop: 8 }}>{f.a}</Text>}
          </Card>
        );
      })}

      <Text style={styles.h3}>Special Events</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {SPECIAL_EVENTS.map((e) => (
          <View key={e.id} style={styles.eventChip}>
            <Text style={{ fontSize: 12.5 }}>
              <Text style={{ fontWeight: "700" }}>{e.label}</Text> — {e.day === "sun" ? "Sunday" : e.day}
              {"time" in e ? ` ${e.time}` : ""}, {e.field}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.h3}>Venue &amp; Logistics</Text>
      <Card>
        <Text style={styles.cardP}>{VENUE_LOGISTICS.fieldLayout}</Text>
        <Text style={styles.cardP}><Text style={styles.bold}>Parking:</Text> {VENUE_LOGISTICS.parking}</Text>
        <Text style={styles.cardP}><Text style={styles.bold}>While you're there:</Text> {VENUE_LOGISTICS.onSitePark}</Text>
        <Text style={styles.cardP}><Text style={styles.bold}>Hours:</Text> {VENUE_LOGISTICS.hours}</Text>
        <Text style={[styles.cardP, { marginBottom: 0 }]}>
          <Text style={styles.bold}>Venue phone:</Text>{" "}
          <Text style={styles.link} onPress={() => openPhone(VENUE_LOGISTICS.phone)}>{VENUE_LOGISTICS.phone}</Text>
        </Text>
      </Card>
    </View>
  );
}

function TravelSeg() {
  const [open, setOpen] = useState<PlaceDetail | null>(null);

  return (
    <View>
      <Text style={styles.p}>{TRAVEL_GUIDE.intro}</Text>

      <Text style={styles.h3}>✈️ Flights</Text>
      {TRAVEL_GUIDE.airports.map((a) => (
        <Card
          key={a.code}
          onPress={() =>
            setOpen({
              emoji: "✈️",
              title: `${a.code} — ${a.name}`,
              tagline: a.note,
              driveTime: a.driveTime,
              description: `Airlines: ${a.airlines}`,
            })
          }
          style={{ marginBottom: 8 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{a.code} — {a.name}</Text>
            <Text style={{ fontSize: 12, color: theme.color.purple, fontWeight: "700" }}>{a.driveTime}</Text>
          </View>
          {a.note && <Text style={{ fontSize: 12, color: theme.color.textMuted, fontStyle: "italic", marginTop: 2 }}>{a.note}</Text>}
        </Card>
      ))}
      <Text style={{ backgroundColor: "#F1EFF5", borderRadius: theme.radius.sm, padding: 10, fontSize: 12.5, marginBottom: 8 }}>
        💡 {TRAVEL_GUIDE.internationalNote}
      </Text>

      <Text style={{ fontWeight: "700", fontSize: 13, marginBottom: 8 }}>Airline Discount Codes</Text>
      {TRAVEL_GUIDE.airlineDiscountCodes.map((c) => (
        <Card
          key={c.airline}
          onPress={() => setOpen({ emoji: "🎫", title: c.airline, subtitle: `Code: ${c.code}`, description: c.instructions })}
          style={{ marginBottom: 6 }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13 }}>{c.airline} <Text style={{ color: theme.color.textMuted, fontWeight: "400" }}>· tap for code</Text></Text>
        </Card>
      ))}

      <Text style={styles.h3}>🏨 Hotels</Text>
      <Card style={{ marginBottom: 8, backgroundColor: "#F1EFF5" }}>
        <Text style={{ fontSize: 12.5, marginBottom: 6 }}>{TRAVEL_GUIDE.hotelDeposit.note}</Text>
        {TRAVEL_GUIDE.hotelDeposit.tiers.map((t) => (
          <Text key={t} style={{ fontSize: 12.5, marginBottom: 2 }}>• {t}</Text>
        ))}
        <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 4 }}>{TRAVEL_GUIDE.hotelDeposit.fullPrice}</Text>
      </Card>
      {TRAVEL_GUIDE.hotels.map((h) => (
        <Card
          key={h.name}
          onPress={() =>
            setOpen({
              emoji: "🏨",
              title: h.name,
              subtitle: h.isHeadquarters ? "★ Our headquarters hotel" : undefined,
              distance: h.distance,
              driveTime: h.driveTime,
              pricing: h.pricePerNight,
              description: `${h.bedTypes} · Tax: ${h.tax}\n\n${h.perks}`,
            })
          }
          style={{ marginBottom: 8 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{h.name}</Text>
              {h.isHeadquarters && <Text style={styles.hqBadge}>OUR HEADQUARTERS HOTEL</Text>}
            </View>
            <Text style={{ fontWeight: "800", color: theme.color.purple, fontSize: 14 }}>{h.pricePerNight}</Text>
          </View>
        </Card>
      ))}
      {TRAVEL_GUIDE.hotelPricingNotes.map((n) => (
        <Text key={n} style={{ fontSize: 11, color: theme.color.textMuted, marginBottom: 4, lineHeight: 15 }}>• {n}</Text>
      ))}

      <Text style={styles.h3}>🚗 Rental Cars</Text>
      {TRAVEL_GUIDE.rentalCars.map((r) => (
        <Card
          key={r.company}
          onPress={() => setOpen({ emoji: "🚗", title: r.company, subtitle: `Code: ${r.code}`, description: r.instructions })}
          style={{ marginBottom: 6 }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13 }}>{r.company} <Text style={{ color: theme.color.textMuted, fontWeight: "400" }}>· tap for code</Text></Text>
        </Card>
      ))}

      <Text style={styles.h3}>💰 Budget</Text>
      <Text style={{ fontSize: 11.5, color: theme.color.textMuted, fontStyle: "italic", marginBottom: 8 }}>{TRAVEL_GUIDE.budgetNote}</Text>
      {TRAVEL_GUIDE.budgetTiers.map((t) => (
        <Card
          key={t.region}
          onPress={() =>
            setOpen({
              emoji: "💰",
              title: t.region,
              tagline: t.cities,
              description: `${t.travelTime}\n\n👤 Solo: ${t.solo}\n👨‍👩‍👧‍👦 Family of 4: ${t.family}`,
            })
          }
          style={{ marginBottom: 6 }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{t.region}</Text>
        </Card>
      ))}
      <PlaceDetailModal place={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function LocalSeg() {
  const [open, setOpen] = useState<PlaceDetail | null>(null);
  return (
    <View>
      <Text style={styles.p}>
        Explore the best local attractions and activities near the SoccerPlex — from adventure parks and escape rooms to farms, state parks, and museums — all within 35 minutes. Sorted closest to farthest. Tap one for the full details.
      </Text>
      {LOCAL_EXPERIENCES.map((e) => (
        <Card
          key={e.name}
          onPress={() =>
            setOpen({
              emoji: e.emoji,
              title: e.name,
              subtitle: e.city,
              tagline: e.tagline,
              description: e.description,
              distance: e.distance,
              driveTime: e.driveTime,
              address: e.address,
              hours: e.hours,
              pricing: e.pricing,
              website: e.website,
              offer: e.umojaOffer,
              featured: e.featured,
            })
          }
          style={{ marginBottom: 8, ...(e.featured ? styles.featuredCard : null) }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 14 }}>
                {e.emoji} {e.name}{e.featured && <Text style={styles.featuredBadge}>  ★ UMOJA PICK</Text>}
              </Text>
              <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }} numberOfLines={2}>
                {e.city} · {e.tagline}
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, color: theme.color.purple, fontWeight: "700" }}>{e.distance} · {e.driveTime}</Text>
          </View>
          {e.umojaOffer && <Text style={styles.offerChip}>🎟️ Umoja offer available</Text>}
        </Card>
      ))}
      <PlaceDetailModal place={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function MuslimSeg() {
  const g = MUSLIM_FAMILY_GUIDE;
  const [open, setOpen] = useState<PlaceDetail | null>(null);
  return (
    <View>
      <Text style={styles.p}>{g.intro}</Text>
      <Text style={{ fontSize: 11.5, color: theme.color.textMuted, marginBottom: 14 }}>
        {g.stats.mosques} Mosques · {g.stats.restaurants} Halal Restaurants · {g.stats.markets} Halal Markets
      </Text>

      <Text style={styles.h3}>🕐 Estimated Prayer Times</Text>
      <Card style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <PrayerTime label="Fajr" time={g.prayerTimes.fajr} />
          <PrayerTime label="Dhuhr" time={g.prayerTimes.dhuhr} />
          <PrayerTime label="Asr" time={g.prayerTimes.asr} />
          <PrayerTime label="Maghrib" time={g.prayerTimes.maghrib} />
          <PrayerTime label="Isha" time={g.prayerTimes.isha} />
          <PrayerTime label="Jumu'ah" time={g.prayerTimes.jumuah} />
        </View>
      </Card>
      <Text style={{ fontSize: 11, color: theme.color.textMuted, fontStyle: "italic", marginBottom: 12 }}>⚠️ {g.prayerTimesNote}</Text>

      <Text style={styles.h3}>🕌 Mosques &amp; Prayer Spaces</Text>
      {g.mosques.map((m) => (
        <Card
          key={m.name}
          onPress={() =>
            setOpen({
              emoji: "🕌",
              title: m.name,
              tagline: m.tagline,
              description: m.description,
              distance: m.distance,
              driveTime: m.driveTime,
              address: m.address,
              website: m.website,
            })
          }
          style={{ marginBottom: 8 }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{m.name}</Text>
          <Text style={{ fontSize: 12, color: theme.color.textMuted, fontStyle: "italic", marginTop: 2 }} numberOfLines={2}>{m.tagline}</Text>
          <Text style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 6 }}>📍 {m.distance} · {m.driveTime}</Text>
        </Card>
      ))}

      <Text style={styles.h3}>🛒 Halal Grocery &amp; Markets</Text>
      {g.halalMarkets.map((m) => (
        <Card
          key={m.name}
          onPress={() =>
            setOpen({
              emoji: "🛒",
              title: m.name,
              subtitle: m.type,
              rating: m.rating,
              distance: m.distance,
              driveTime: m.driveTime,
              address: m.address,
              hours: m.hours,
              phone: m.phone,
            })
          }
          style={{ marginBottom: 8 }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{m.name}{m.rating ? <Text style={{ color: theme.color.gold }}>  ⭐ {m.rating}</Text> : null}</Text>
          <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{m.type}</Text>
          <Text style={{ fontSize: 11.5, marginTop: 6 }}>📍 {m.distance} · {m.driveTime}</Text>
        </Card>
      ))}

      <Text style={styles.h3}>🍽️ Halal Restaurants</Text>
      <Text style={{ fontSize: 11, color: theme.color.textMuted, marginBottom: 6 }}>⭐ = closest options, under 5 miles</Text>
      {g.halalRestaurants.map((r) => (
        <Card
          key={r.name}
          onPress={() =>
            setOpen({
              emoji: "🍽️",
              title: r.name,
              distance: r.distance,
              locations: r.locations,
              website: r.website,
            })
          }
          style={{ marginBottom: 6 }}
        >
          <Text style={{ fontWeight: "700", fontSize: 13 }}>{r.closest ? "⭐ " : ""}{r.name} <Text style={{ color: theme.color.textMuted, fontWeight: "400", fontSize: 11.5 }}>{r.distance}</Text></Text>
          <Text style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 2 }}>
            {r.locations.length} location{r.locations.length === 1 ? "" : "s"} · tap for addresses &amp; website
          </Text>
        </Card>
      ))}
      <PlaceDetailModal place={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function PrayerTime({ label, time }: { label: string; time: string }) {
  return (
    <View style={{ alignItems: "center", minWidth: 74 }}>
      <Text style={{ fontSize: 11, color: theme.color.textMuted, fontWeight: "700" }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "700", marginTop: 2 }}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontWeight: "800", fontSize: 26, color: theme.color.text },
  sub: { color: theme.color.textMuted, fontSize: 13, marginTop: 4, lineHeight: 19 },
  section: { paddingHorizontal: 16 },
  sectionGap: { marginTop: 8 },
  sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 10 },
  subLabel: { fontSize: 11, fontWeight: "800", color: theme.color.textMuted, marginBottom: 6, letterSpacing: 0.4 },
  p: { fontSize: 13, color: theme.color.text, marginBottom: 14, lineHeight: 19 },
  h3: { fontFamily: theme.font.display, fontWeight: "700", fontSize: 16, marginTop: 6, marginBottom: 8 },
  cardP: { fontSize: 13, marginBottom: 8 },
  bold: { fontWeight: "700" },
  eventChip: { backgroundColor: "#F1EFF5", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  hqBadge: {
    backgroundColor: theme.color.gold,
    color: theme.color.navy,
    fontSize: 10,
    fontWeight: "800",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  featuredCard: { borderWidth: 2, borderColor: theme.color.gold },
  featuredBadge: { fontSize: 10, fontWeight: "800", color: theme.color.navy, backgroundColor: theme.color.gold, borderRadius: 99, paddingHorizontal: 6 },
  link: { color: theme.color.blue, fontWeight: "600" },
  offerChip: {
    alignSelf: "flex-start",
    backgroundColor: theme.color.successBg,
    color: theme.color.success,
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
});
