import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import type { ChannelRole } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useRoleChannel } from "../hooks/useData";
import { sendRoleMessage } from "../lib/callables";
import { PrimaryButton } from "./ui";

/** One-way broadcast + reply-back channel for an entire role (volunteers/referees), mirroring the per-team Channel tab but scoped by role instead of roster. */
export function RoleChannelPanel({ role }: { role: ChannelRole }) {
  const { profile } = useAuth();
  const { data: channel } = useRoleChannel(role);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const hasRole = profile?.roles?.includes(role) ?? false;
  const canPost = isStaff || hasRole;
  const messages = [...(channel?.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendRoleMessage({ role, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <View>
      <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 14 }}>
        One-way broadcast from organizers — anyone with this role can reply back.
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
        {messages.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No messages yet.</Text>}
      </View>

      {canPost ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Send a message…" style={styles.input} />
          <PrimaryButton disabled={sending || !draft.trim()} onPress={send}>Send</PrimaryButton>
        </View>
      ) : (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only organizers can post here.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 10, padding: 10, maxWidth: "80%" },
  input: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
});
