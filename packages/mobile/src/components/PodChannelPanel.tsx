import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { usePodChannel } from "../hooks/useData";
import { sendPodMessage } from "../lib/callables";
import { PrimaryButton } from "./ui";

/** Flat peer group chat for a Pod — messages align by "is this me," not "is this staff," since admin/commissioner/referee/volunteer all post as equals here. */
export function PodChannelPanel({ podId, canPost }: { podId: string; canPost: boolean }) {
  const { profile } = useAuth();
  const { data: channel } = usePodChannel(podId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendPodMessage({ podId, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <View>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {messages.map((m) => {
          const isMe = m.authorUid === profile?.uid;
          return (
            <View
              key={m.id}
              style={[styles.bubble, { alignSelf: isMe ? "flex-end" : "flex-start", backgroundColor: isMe ? theme.color.navy : "#F1EFF5" }]}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", opacity: 0.8, marginBottom: 2, color: isMe ? "#fff" : theme.color.textMuted }}>
                {isMe ? "You" : m.authorName}
              </Text>
              <Text style={{ fontSize: 13.5, color: isMe ? "#fff" : theme.color.text }}>{m.text}</Text>
            </View>
          );
        })}
        {messages.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No messages yet.</Text>}
      </View>

      {canPost ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Send a message…" style={styles.input} />
          <PrimaryButton disabled={sending || !draft.trim()} onPress={send}>Send</PrimaryButton>
        </View>
      ) : (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only pod members can post here.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 10, padding: 10, maxWidth: "80%" },
  input: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
});
