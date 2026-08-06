import { Linking } from "react-native";

/**
 * Website fields in the shared Experiences data are hand-entered copy, not
 * guaranteed URLs — one value is literally "yelp.com (search miyaji-kebab)".
 * Taking only the first whitespace token and assuming https gets a real,
 * openable link out of every entry without needing to fix the source data
 * for cases just like it in the future.
 */
export function openWebsite(url: string): Promise<void> {
  const token = url.trim().split(/\s+/)[0] ?? "";
  const href = token.startsWith("http") ? token : `https://${token}`;
  return Linking.openURL(href).catch(() => {});
}

export function openPhone(phone: string): Promise<void> {
  const digits = phone.replace(/[^\d+]/g, "");
  return Linking.openURL(`tel:${digits}`).catch(() => {});
}

/** A universal https deep link — works via plain Linking.openURL on both platforms with no native maps SDK or app.json scheme additions. */
export function openMaps(address: string): Promise<void> {
  return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`).catch(() => {});
}
