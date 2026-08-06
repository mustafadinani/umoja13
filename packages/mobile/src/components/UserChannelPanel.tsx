import { useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useUserChannel } from "../hooks/useData";
import { sendUserMessage, askUmojaChannel } from "../lib/callables";
import { Pill, PrimaryButton } from "./ui";

type Target = "ai" | "organizer";

/**
 * The one merged thread: Ask Umoja (AI) and Message Organizers (human staff)
 * used to be two separate screens with two separate data stores. Both now
 * live in this same userChannels/{uid} doc — "ai" turns never notify staff,
 * "user"/"admin" turns work exactly as they did before. The compose bar's
 * two-pill toggle decides which one a given message goes to; it's declared
 * before sending, not a mode you switch into after the fact.
 */
export function UserChannelPanel({ uid }: { uid: string }) {
  const { profile } = useAuth();
  const { data: channel } = useUserChannel(uid);
  const [draft, setDraft] = useState("");
  const [manualTarget, setManualTarget] = useState<Target | null>(null);
  const [pendingTarget, setPendingTarget] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isOwner = profile?.uid === uid;
  const canPost = isStaff || isOwner;
  const canUseAi = isOwner; // staff replying on someone else's thread always talks to the person, never the bot
  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  // Sticky organizer mode: if the most recent non-AI message was from an
  // organizer, default the toggle to "organizer" so a user mid-conversation
  // with staff doesn't get their next reply intercepted by the bot. Only
  // used as a fallback until the user picks a side themselves.
  const lastNonAi = [...messages].reverse().find((m) => m.from !== "ai");
  const defaultTarget: Target = lastNonAi?.from === "admin" ? "organizer" : "ai";
  const target: Target = canUseAi ? manualTarget ?? defaultTarget : "organizer";

  async function send() {
    const text = draft.trim();
    if (!text || pendingTarget === target) return;
    setDraft("");
    setError(null);
    setPendingTarget(target);
    try {
      if (canUseAi && target === "ai") {
        await askUmojaChannel({ text });
      } else {
        await sendUserMessage({ targetUid: uid, text });
      }
    } catch {
      setError(
        target === "ai"
          ? "Ask Umoja didn't answer — try again, or switch to Ask an organizer above."
          : "Couldn't send that — try again."
      );
    } finally {
      setPendingTarget(null);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: theme.color.bg }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Text style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 6 }}>
          {isOwner
            ? "Ask a question and Ask Umoja will answer — or switch to Ask an organizer any time. Organizers can see this whole conversation."
            : "Message the organizers directly — an admin or the commissioner will reply here."}
        </Text>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, bubbleStyle(m.from)]}>
            {m.from !== "user" && (
              <Text style={[styles.bubbleLabel, { color: m.from === "admin" ? "#fff" : theme.color.textMuted, opacity: m.from === "admin" ? 0.8 : 1 }]}>
                {m.from === "admin" ? "Organizers" : "🤖 Ask Umoja"}
              </Text>
            )}
            <Text style={{ fontSize: 13.5, color: m.from === "admin" || m.from === "user" ? bubbleTextColor(m.from) : theme.color.text }}>
              {m.text}
            </Text>
          </View>
        ))}
        {messages.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No messages yet — ask a question below.</Text>}
        {pendingTarget === "ai" && (
          <View style={[styles.bubble, bubbleStyle("ai")]}>
            <Text style={[styles.bubbleLabel, { color: theme.color.textMuted }]}>🤖 Ask Umoja</Text>
            <Text style={{ fontSize: 13.5, color: theme.color.textMuted, fontStyle: "italic" }}>is typing…</Text>
          </View>
        )}
      </ScrollView>

      {canPost ? (
        <View style={styles.composeBar}>
          {canUseAi && (
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
              <Pill active={target === "ai"} onPress={() => setManualTarget("ai")}>🤖 Ask Umoja</Pill>
              <Pill active={target === "organizer"} onPress={() => setManualTarget("organizer")}>🙋 Ask an organizer</Pill>
            </View>
          )}
          {canUseAi && manualTarget === "organizer" && lastNonAi?.from !== "admin" && (
            <Text style={{ color: theme.color.textMuted, fontSize: 11.5, textAlign: "center", marginBottom: 6 }}>
              Your next message goes to a real organizer. They'll reply right here.
            </Text>
          )}
          {error && <Text style={{ color: theme.color.danger, fontSize: 12, marginBottom: 6 }}>{error}</Text>}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              ref={inputRef}
              autoFocus
              value={draft}
              onChangeText={setDraft}
              placeholder={target === "organizer" ? "Message the organizers…" : "Ask a question…"}
              style={styles.input}
              onSubmitEditing={send}
            />
            <PrimaryButton
              disabled={!draft.trim() || pendingTarget === target}
              onPress={send}
              style={{
                backgroundColor: !draft.trim() || pendingTarget === target ? "#C9C3D8" : target === "organizer" ? theme.color.navy : theme.color.purple,
                paddingHorizontal: 18,
              }}
            >
              {pendingTarget === target ? "…" : "→"}
            </PrimaryButton>
          </View>
        </View>
      ) : (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5, padding: 16 }}>Only this user and organizers can post here.</Text>
      )}
    </KeyboardAvoidingView>
  );
}

function bubbleStyle(from: "admin" | "user" | "ai"): { alignSelf: "flex-start" | "flex-end"; backgroundColor: string } {
  if (from === "user") return { alignSelf: "flex-end", backgroundColor: theme.color.purple };
  if (from === "admin") return { alignSelf: "flex-start", backgroundColor: theme.color.navy };
  return { alignSelf: "flex-start", backgroundColor: "#F1EFF5" };
}

function bubbleTextColor(from: "admin" | "user"): string {
  return from === "admin" || from === "user" ? "#fff" : theme.color.text;
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 12, padding: 10, maxWidth: "85%" },
  bubbleLabel: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  composeBar: { padding: 12, borderTopWidth: 1, borderTopColor: theme.color.border, backgroundColor: "#fff" },
  input: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
});
