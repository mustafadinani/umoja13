import { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useUserChannel } from "../hooks/useData";
import { sendUserMessage, askUmojaChannel } from "../lib/callables";
import { PrimaryButton } from "./ui";
import { ChannelAttachButton } from "./ChannelAttachButton";
import { ChannelAttachmentThumb } from "./ChannelAttachmentThumb";
import { Lightbox } from "./Lightbox";
import type { ChannelAttachment } from "../lib/uploadChannelAttachment";

type Target = "ai" | "organizer";

/**
 * The one merged thread: Ask Umoja (AI) and Message Organizers (human staff)
 * used to be two separate screens with two separate data stores. Both now
 * live in this same userChannels/{uid} doc — "ai" turns never notify staff,
 * "user"/"admin" turns work exactly as they did before.
 *
 * No mode toggle: the bot is simply the default. Reaching a person is one
 * deliberate, always-visible button, not a switch you have to understand
 * up front — pressing it flips this session over to "organizer" for good
 * (no bouncing back to the bot mid-conversation), and a divider marks the
 * exact point a human's first reply lands, so the thread explains itself
 * on scroll-back for both the user and staff.
 */
export function UserChannelPanel({ uid }: { uid: string }) {
  const { profile } = useAuth();
  const { data: channel } = useUserChannel(uid);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<ChannelAttachment | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<ChannelAttachment | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isOwner = profile?.uid === uid;
  const canPost = isStaff || isOwner;
  const canUseAi = isOwner; // staff replying on someone else's thread always talks to the person, never the bot
  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const firstAdminIndex = messages.findIndex((m) => m.from === "admin");

  const target: Target = canUseAi && !escalated ? "ai" : "organizer";

  async function send() {
    const text = draft.trim();
    if ((!text && !attachment) || pendingTarget === target) return;
    setDraft("");
    setError(null);
    setPendingTarget(target);
    try {
      if (canUseAi && target === "ai") {
        await askUmojaChannel({ text });
      } else {
        await sendUserMessage({ targetUid: uid, text, ...(attachment ?? {}) });
        setAttachment(null);
      }
    } catch {
      setError(target === "ai" ? "Ask Umoja didn't answer — try again, or tap Talk to an organizer below." : "Couldn't send that — try again.");
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
            ? "Ask a question and Ask Umoja will answer right away — tap Talk to an organizer below any time you need a real person."
            : isStaff
            ? "One-way channel between this user and the organizers."
            : "Message the organizers directly — an admin or the commissioner will reply here."}
        </Text>
        {messages.map((m, i) => (
          <View key={m.id}>
            {i === firstAdminIndex && <Text style={styles.divider}>— An organizer joined this conversation —</Text>}
            <View style={[styles.bubble, bubbleStyle(m.from)]}>
              {m.from !== "user" && (
                <Text style={[styles.bubbleLabel, { color: m.from === "admin" ? "#fff" : theme.color.textMuted, opacity: m.from === "admin" ? 0.8 : 1 }]}>
                  {m.from === "admin" ? "Organizers" : "🤖 Ask Umoja"}
                </Text>
              )}
              {m.mediaUrl && m.mediaType && (
                <ChannelAttachmentThumb mediaUrl={m.mediaUrl} mediaType={m.mediaType} onPress={() => setLightbox({ mediaUrl: m.mediaUrl!, mediaType: m.mediaType! })} />
              )}
              {m.text ? (
                <Text style={{ fontSize: 13.5, color: m.from === "admin" || m.from === "user" ? bubbleTextColor(m.from) : theme.color.text, marginTop: m.mediaUrl ? 6 : 0 }}>
                  {m.text}
                </Text>
              ) : null}
            </View>
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
            escalated ? (
              <Text style={{ color: theme.color.textMuted, fontSize: 11.5, textAlign: "center", marginBottom: 8 }}>
                You're talking to an organizer now — they'll reply right here.
              </Text>
            ) : (
              <TouchableOpacity onPress={() => setEscalated(true)} style={{ alignSelf: "center", marginBottom: 8 }}>
                <View style={styles.escalateButton}>
                  <Text style={styles.escalateButtonText}>🙋 Talk to an organizer</Text>
                </View>
              </TouchableOpacity>
            )
          )}
          {error && <Text style={{ color: theme.color.danger, fontSize: 12, marginBottom: 6 }}>{error}</Text>}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            {target === "organizer" && <ChannelAttachButton value={attachment} onChange={setAttachment} disabled={pendingTarget === target} />}
            <TextInput
              ref={inputRef}
              autoFocus
              value={draft}
              onChangeText={setDraft}
              placeholder={target === "organizer" ? "Message the organizers…" : "Ask a question…"}
              style={styles.input}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <PrimaryButton
              disabled={(!draft.trim() && !attachment) || pendingTarget === target}
              onPress={send}
              style={{
                backgroundColor: (!draft.trim() && !attachment) || pendingTarget === target ? "#C9C3D8" : target === "organizer" ? theme.color.navy : theme.color.purple,
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

      <Lightbox visible={!!lightbox} src={lightbox?.mediaUrl ?? null} mediaType={lightbox?.mediaType} onClose={() => setLightbox(null)} />
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
  divider: { textAlign: "center", fontSize: 11, fontWeight: "700", color: theme.color.textMuted, marginVertical: 6 },
  composeBar: { padding: 12, borderTopWidth: 1, borderTopColor: theme.color.border, backgroundColor: "#fff" },
  input: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
  escalateButton: { backgroundColor: "#F1EFF5", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  escalateButtonText: { fontSize: 12.5, fontWeight: "700", color: theme.color.navy },
});
