import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { Modal } from "./ui";
import { openMaps, openPhone, openWebsite } from "../lib/links";

/**
 * One generic detail modal for every Experiences row — Local attractions,
 * mosques, halal markets, halal restaurants — instead of four near-
 * identical ones. Each section maps its own record into this flat
 * presentational shape rather than passing its underlying shared type
 * through, so this component never needs to know which segment it's in.
 */
export interface PlaceDetail {
  emoji?: string;
  title: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  distance?: string;
  driveTime?: string;
  address?: string;
  /** Multiple locations (e.g. a restaurant with several branches) — shown as a plain list; Maps opens the first one. */
  locations?: string[];
  hours?: string;
  pricing?: string;
  phone?: string;
  website?: string;
  offer?: string;
  featured?: boolean;
  rating?: string;
}

export function PlaceDetailModal({ place, onClose }: { place: PlaceDetail | null; onClose: () => void }) {
  const mapsTarget = place?.address ?? place?.locations?.[0];
  return (
    <Modal visible={!!place} onClose={onClose}>
      {place && (
        <View>
          <Text style={styles.title}>
            {place.emoji ? `${place.emoji} ` : ""}{place.title}
            {place.featured && <Text style={styles.featuredBadge}>  ★ UMOJA PICK</Text>}
            {place.rating && <Text style={styles.ratingBadge}>  ⭐ {place.rating}</Text>}
          </Text>
          {place.subtitle && <Text style={styles.subtitle}>{place.subtitle}</Text>}
          {(place.distance || place.driveTime) && (
            <Text style={styles.distance}>{[place.distance, place.driveTime].filter(Boolean).join(" · ")}</Text>
          )}
          {place.tagline && <Text style={styles.tagline}>{place.tagline}</Text>}
          {place.description && <Text style={styles.description}>{place.description}</Text>}

          {place.offer && <Text style={styles.offer}>🎟️ Umoja Partner Offer: {place.offer}</Text>}

          <View style={styles.facts}>
            {place.locations && place.locations.length > 0 ? (
              place.locations.map((loc) => <Text key={loc} style={styles.fact}>📍 {loc}</Text>)
            ) : place.address ? (
              <Text style={styles.fact}>📍 {place.address}</Text>
            ) : null}
            {place.hours && <Text style={styles.fact}>🕐 {place.hours}</Text>}
            {place.pricing && <Text style={styles.fact}>💵 {place.pricing}</Text>}
          </View>

          <View style={styles.actions}>
            {mapsTarget && (
              <ActionRow label="Open in Maps" icon="📍" onPress={() => openMaps(mapsTarget)} />
            )}
            {place.phone && <ActionRow label={`Call ${place.phone}`} icon="☎️" onPress={() => openPhone(place.phone!)} />}
            {place.website && <ActionRow label="Visit website" icon="🌐" onPress={() => openWebsite(place.website!)} />}
          </View>
        </View>
      )}
    </Modal>
  );
}

function ActionRow({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionRow}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", fontSize: 19 },
  featuredBadge: { fontSize: 11, fontWeight: "800", color: theme.color.navy, backgroundColor: theme.color.gold, borderRadius: 99 },
  ratingBadge: { fontSize: 13, fontWeight: "700", color: theme.color.gold },
  subtitle: { color: theme.color.textMuted, fontSize: 12.5, marginTop: 4 },
  distance: { color: theme.color.purple, fontWeight: "700", fontSize: 12.5, marginTop: 4 },
  tagline: { color: theme.color.textMuted, fontStyle: "italic", fontSize: 13, marginTop: 8 },
  description: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  offer: {
    backgroundColor: theme.color.successBg,
    color: theme.color.success,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: 12.5,
    marginTop: 12,
    fontWeight: "600",
  },
  facts: { marginTop: 12, gap: 4 },
  fact: { fontSize: 12.5, color: theme.color.textMuted },
  actions: { marginTop: 14, gap: 8 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1EFF5",
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  actionIcon: { fontSize: 16, marginRight: 10 },
  actionLabel: { flex: 1, fontWeight: "700", fontSize: 13.5 },
  actionChevron: { fontSize: 18, color: theme.color.textMuted },
});
