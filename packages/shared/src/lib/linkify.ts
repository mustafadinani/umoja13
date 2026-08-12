/**
 * Splits free text into plain-text and URL segments — used everywhere an
 * admin's free-typed body text (announcements, notifications) is rendered
 * back out, since a plain `{body}` render leaves any URL an admin pasted in
 * as inert text with no way to tap/click through. Deliberately just
 * http(s) URLs (no bare "www." or email autolinking) — narrow but never
 * wrong, since every link admins actually paste is a full https:// URL
 * (copied straight from a browser address bar).
 */
export interface LinkifiedSegment {
  text: string;
  /** Set only for a URL segment — the exact matched URL, unmodified. */
  url?: string;
}

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g;

export function linkifyText(text: string): LinkifiedSegment[] {
  const segments: LinkifiedSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) segments.push({ text: text.slice(lastIndex, start) });
    segments.push({ text: match[0], url: match[0] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) });
  return segments;
}
