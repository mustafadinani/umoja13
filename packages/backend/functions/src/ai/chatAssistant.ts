import { onCall, HttpsError } from "firebase-functions/v2/https";
import { COLLECTIONS, VENUE, CATEGORIES, type ChatMessage, type ChatEscalationTopic } from "@umoja/shared";
import { db } from "../util/admin.js";
import { getClaude, CLAUDE_MODEL, anthropicApiKey } from "./claudeClient.js";
import { nextCaseNumber } from "../util/counters.js";

interface AskUmojaRequest {
  transcript: ChatMessage[]; // prior turns, most recent last
  message: string;
}

const SYSTEM_PROMPT = `You are "Ask Umoja", the help assistant for the Umoja Games youth/adult soccer tournament \
at ${VENUE.name} (${VENUE.address}), ${VENUE.dates}. Categories: ${CATEGORIES.map((c) => c.label).join(", ")}. \
Answer questions about schedule, check-in/tournament passes, the Hunt scavenger game, field map, parking, food, \
lost & found, and sponsors, in 2-4 sentences, warm and concise. If you don't have enough information to answer \
confidently, say so plainly and suggest the user tap "Still stuck? Ask an organizer" rather than guessing.`;

export const askUmoja = onCall<AskUmojaRequest>({ secrets: [anthropicApiKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { transcript, message } = request.data;
  const claude = getClaude();
  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      ...transcript.map((m) => ({ role: m.role, content: m.text }) as const),
      { role: "user" as const, content: message },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const reply = textBlock && textBlock.type === "text" ? textBlock.text : "Sorry, I couldn't come up with an answer.";
  return { reply };
});

interface EscalateChatRequest {
  transcript: ChatMessage[];
  topic: ChatEscalationTopic;
  message: string;
}

/** "Still stuck? Ask an organizer" — stores the full transcript and files a fan_message Incident in the commissioner inbox. */
export const escalateChat = onCall<EscalateChatRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { transcript, topic, message } = request.data;
  const caseNumber = await nextCaseNumber("UQ");
  const now = Date.now();

  const escalationRef = db.collection(COLLECTIONS.chatEscalations).doc();
  await escalationRef.set({
    id: escalationRef.id,
    ticketNumber: caseNumber,
    userUid: uid,
    topic,
    message,
    transcript,
    createdAt: now,
  });

  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  const incidentRef = db.collection(COLLECTIONS.incidents).doc();
  await incidentRef.set({
    id: incidentRef.id,
    caseNumber,
    source: "fan_message",
    filedByUid: uid,
    filedByName: userSnap.data()?.displayName ?? "Fan",
    filedByRole: "fan",
    chatEscalationId: escalationRef.id,
    text: message,
    status: "submitted",
    thread: [],
    fee: null,
    createdAt: now,
    updatedAt: now,
  });

  return { ticketNumber: caseNumber };
});
