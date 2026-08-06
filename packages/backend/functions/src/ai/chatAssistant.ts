import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  VENUE,
  CATEGORIES,
  SPECIAL_EVENTS,
  UMOJA_FAQ,
  THINGS_TO_DO,
  VENUE_LOGISTICS,
  AI_AUTHOR_UID,
  AI_AUTHOR_NAME,
  type UserChannel,
  type UserChannelMessage,
  type UserProfile,
} from "@umoja/shared";
import { db } from "../util/admin.js";
import { resolveAuthorName } from "../util/authorName.js";
import { getClaude, CLAUDE_MODEL, anthropicApiKey } from "./claudeClient.js";

interface AskUmojaChannelRequest {
  text: string;
}

const FAQ_BLOCK = UMOJA_FAQ.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
const THINGS_TO_DO_BLOCK = THINGS_TO_DO.map((t) => `- ${t.name}: ${t.desc}`).join("\n");
const SPECIAL_EVENTS_BLOCK = SPECIAL_EVENTS.map((e) => `${e.label} (${e.day}${"time" in e ? ` ${e.time}` : ""}, ${e.field})`).join(", ");

const SYSTEM_PROMPT = `You are "Ask Umoja", the help assistant for the Umoja Games youth/adult soccer tournament \
at ${VENUE.name} (${VENUE.address}), ${VENUE.dates}. Categories: ${CATEGORIES.map((c) => c.label).join(", ")}. \
Special calendar events: ${SPECIAL_EVENTS_BLOCK}.

Answer in 2-4 sentences, warm and concise. Use the reference info below when it's relevant, but you don't have \
live game times/scores/brackets — for those, tell the user to check the Schedule/Standings tabs instead of guessing. \
Hours and phone numbers below can change, so hedge on those ("typically", "as of our last check") rather than \
stating them as certain. If you don't have enough information to answer confidently, say so plainly and tell the \
user they can switch this same conversation to a real organizer using the "Ask an organizer" control below the \
message box — don't invent an answer.

This is a merged conversation thread: some earlier turns are prefixed "(Organizer <name>):" — those were written by \
a real Umoja staff member in this same thread, not by you. Treat them as authoritative and never contradict them; \
if the user is clearly waiting on an organizer's reply, say so rather than answering on their behalf. Reply with \
plain conversational text only — no internal tags, no markdown headers.

--- App FAQ ---
${FAQ_BLOCK}

--- Venue & logistics (Maryland SoccerPlex) ---
${VENUE_LOGISTICS.fieldLayout}
Parking: ${VENUE_LOGISTICS.parking}
On-site park: ${VENUE_LOGISTICS.onSitePark}
Hours: ${VENUE_LOGISTICS.hours}
Venue phone: ${VENUE_LOGISTICS.phone}

--- Nearby things to do ---
${THINGS_TO_DO_BLOCK}`;

const AI_CONTEXT_TURNS = 20;
const MAX_MESSAGE_LENGTH = 2000;
/** Once a channel's messages array gets this long, drop the oldest entries rather than let one Firestore doc grow unbounded. */
const MAX_STORED_MESSAGES = 400;
const TRIM_TO = 300;

type ClaudeTurn = { role: "user" | "assistant"; content: string };

/**
 * Builds the transcript sent to the model from the channel's real history —
 * never from anything the client claims happened. Organizer (`admin`) turns
 * are folded into the assistant role too (Claude only knows user/assistant),
 * but labeled so the model treats them as a human's words, not its own.
 */
function toClaudeMessages(history: UserChannelMessage[], newText: string): ClaudeTurn[] {
  const slice = [...history].sort((a, b) => a.createdAt - b.createdAt).slice(-AI_CONTEXT_TURNS);
  const raw: ClaudeTurn[] = slice.map((m) =>
    m.from === "user"
      ? { role: "user", content: m.text }
      : { role: "assistant", content: m.from === "admin" ? `(Organizer ${m.authorName}): ${m.text}` : m.text }
  );
  raw.push({ role: "user", content: newText });

  // The Messages API requires the transcript to start on a user turn.
  while (raw.length && raw[0].role === "assistant") raw.shift();

  // Merge consecutive same-role turns (a real thread often has several
  // organizer lines or several AI-then-organizer lines in a row).
  return raw.reduce<ClaudeTurn[]>((acc, m) => {
    const prev = acc[acc.length - 1];
    if (prev && prev.role === m.role) prev.content += `\n\n${m.content}`;
    else acc.push({ ...m });
    return acc;
  }, []);
}

/**
 * "Ask Umoja" now lives in the same userChannels/{uid} thread as the human
 * "Message the organizers" channel — one merged conversation, so staff see
 * the full back-and-forth (AI + user + organizer) in one place instead of a
 * separate, unreadable transcript. Deliberately does NOT call notifyUsers:
 * an automated reply to your own question should never badge your own inbox
 * or ping staff — that's what makes this a different callable from
 * sendUserMessage rather than a variant of it.
 */
export const askUmojaChannel = onCall<AskUmojaChannelRequest>({ secrets: [anthropicApiKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const text = request.data.text?.trim();
  if (!text) throw new HttpsError("invalid-argument", "Message text is required.");
  if (text.length > MAX_MESSAGE_LENGTH) throw new HttpsError("invalid-argument", "Message is too long.");

  const [userSnap, channelSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).doc(uid).get(),
    db.collection(COLLECTIONS.userChannels).doc(uid).get(),
  ]);
  const profile = userSnap.data() as UserProfile | undefined;
  const history = (channelSnap.data() as UserChannel | undefined)?.messages ?? [];

  const userMessage: UserChannelMessage = {
    id: db.collection(COLLECTIONS.userChannels).doc().id,
    from: "user",
    authorUid: uid,
    authorName: await resolveAuthorName(uid, profile?.displayName),
    text,
    createdAt: Date.now(),
  };

  // Persist the user's own turn before calling the model, so it streams into
  // the UI immediately over the existing onSnapshot listener rather than
  // waiting on the (slower) AI round trip.
  await db.collection(COLLECTIONS.userChannels).doc(uid).set(
    { userId: uid, updatedAt: Date.now(), messages: FieldValue.arrayUnion(userMessage) },
    { merge: true }
  );

  const claude = getClaude();
  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: toClaudeMessages(history, text),
  });
  const textBlock = response.content.find((b) => b.type === "text");
  const reply = textBlock && textBlock.type === "text" ? textBlock.text : "Sorry, I couldn't come up with an answer.";

  const aiMessage: UserChannelMessage = {
    id: db.collection(COLLECTIONS.userChannels).doc().id,
    from: "ai",
    authorUid: AI_AUTHOR_UID,
    authorName: AI_AUTHOR_NAME,
    text: reply,
    createdAt: Date.now(),
  };

  const grown = [...history, userMessage, aiMessage];
  if (grown.length > MAX_STORED_MESSAGES) {
    // Rare path — trim with a plain set rather than arrayUnion, since we
    // already hold the full array in memory here.
    await db.collection(COLLECTIONS.userChannels).doc(uid).set(
      { userId: uid, updatedAt: Date.now(), messages: grown.slice(-TRIM_TO) },
      { merge: true }
    );
  } else {
    await db.collection(COLLECTIONS.userChannels).doc(uid).set(
      { userId: uid, updatedAt: Date.now(), messages: FieldValue.arrayUnion(aiMessage) },
      { merge: true }
    );
  }

  return { reply, message: aiMessage };
});
