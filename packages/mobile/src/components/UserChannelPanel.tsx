import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useUserChannel } from "../hooks/useData";
import { sendUserMessage } from "../lib/callables";
import { PrimaryButton } from "./ui";

/** One-way "message the organizers" channel for a single user — shown on that user's own profile. */
export function UserChannelPanel({ uid }: { uid: string }) {
  const { profile } = useAuth();
  const { data: channel } = useUserChannel(uid);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isOwner = profile?.uid === uid;
  const canPost = isStaff || isOwner;
  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendUserMessage({ targetUid: uid, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <View>
      <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 14 }}>
        Message the organizers directly — an admin or the commissioner will reply here.
      </Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              { alignSelf: m.from === "admin" ? "flex-start" : "flex-end", backgroundColor: m.from === "admin" ? theme.color.navy : "#F1EFF5" },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", opacity: 0.8, marginBottom: 2, color: m.from === "admin" ? "#fff" : theme.color.textMuted }}>
              {m.from === "admin" ? "Organizers" : m.authorName}
            </Text>
            <Text style={{ fontSize: 13.5, color: m.from === "admin" ? "#fff" : theme.color.text }}>{m.text}</Text>
          </View>
        ))}
        {messages.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No messages yet — send the first one below.</Text>}
      </View>

      {canPost ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Message the organizers…" style={styles.input} />
          <PrimaryButton disabled={sending || !draft.trim()} onPress={send}>Send</PrimaryButton>
        </View>
      ) : (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only this user and organizers can post here.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 10, padding: 10, maxWidth: "80%" },
  input: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
});
