import { useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ChatEscalationTopic } from "@umoja/shared";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { theme } from "../lib/theme";
import { askUmoja, escalateChat } from "../lib/callables";
import { PrimaryButton, Pill } from "../components/ui";

interface Msg { role: "user" | "assistant"; text: string }

const TOPICS: { id: ChatEscalationTopic; label: string }[] = [
  { id: "schedule_question", label: "Schedule question" },
  { id: "checkin_passes", label: "Check-in / passes" },
  { id: "lost_and_found", label: "Lost & found" },
  { id: "medical_safety", label: "Medical / safety" },
  { id: "vendors_sponsors", label: "Vendors / sponsors" },
  { id: "something_else", label: "Something else" },
];

export function AskUmojaScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "AskUmoja">) {
  const [mode, setMode] = useState<"chat" | "form" | "sent">("chat");
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", text: "Hi! I'm Ask Umoja. What can I help with?" }]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [topic, setTopic] = useState<ChatEscalationTopic>("something_else");
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function send() {
    if (!draft.trim()) return;
    const next: Msg[] = [...messages, { role: "user", text: draft }];
    setMessages(next);
    setDraft("");
    setSending(true);
    try {
      const res = await askUmoja({ transcript: next.slice(0, -1), message: draft });
      setMessages((m) => [...m, { role: "assistant", text: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't reach the assistant just now." }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  async function submitEscalation() {
    const res = await escalateChat({ transcript: messages, topic, message: draft || "Still stuck — please help." });
    setTicketNumber(res.data.ticketNumber);
    setMode("sent");
  }

  if (mode === "sent") {
    return (
      <View style={styles.doneWrap}>
        <Text style={{ fontSize: 40 }}>✓</Text>
        <Text style={styles.h1}>We've got it.</Text>
        <Text style={styles.sub}>Case #{ticketNumber} is with an organizer. You'll get a notification when there's an update.</Text>
        <PrimaryButton onPress={() => navigation.goBack()} style={{ marginTop: 20, width: "100%" }}>DONE</PrimaryButton>
      </View>
    );
  }

  if (mode === "form") {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.h1}>What's this about?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {TOPICS.map((t) => (
              <Pill key={t.id} active={topic === t.id} onPress={() => setTopic(t.id)}>{t.label}</Pill>
            ))}
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Tell us what's going on…"
            multiline
            numberOfLines={5}
            style={styles.textarea}
          />
          <PrimaryButton onPress={submitEscalation} style={{ width: "100%" }}>SEND TO AN ORGANIZER</PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              { alignSelf: m.role === "user" ? "flex-end" : "flex-start", backgroundColor: m.role === "user" ? theme.color.purple : "#F1EFF5" },
            ]}
          >
            <Text style={{ fontSize: 13.5, color: m.role === "user" ? "#fff" : theme.color.text }}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputBar}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question…"
            style={styles.input}
            onSubmitEditing={send}
          />
          <PrimaryButton onPress={send} disabled={sending || !draft.trim()} style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
            {sending ? "…" : "→"}
          </PrimaryButton>
        </View>
        <TouchableOpacity onPress={() => setMode("form")} style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 12.5, color: theme.color.blue, fontWeight: "700", textAlign: "center" }}>Still stuck? Ask an organizer →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h1: { fontWeight: "800", fontSize: 18, marginBottom: 12 },
  sub: { color: theme.color.textMuted, fontSize: 13.5, textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
  doneWrap: { flex: 1, backgroundColor: theme.color.bg, alignItems: "center", justifyContent: "center", padding: 30 },
  bubble: { borderRadius: 12, padding: 10, maxWidth: "85%" },
  inputBar: { padding: 12, borderTopWidth: 1, borderTopColor: theme.color.border, backgroundColor: "#fff" },
  input: { flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5 },
  textarea: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 13.5,
    minHeight: 110,
    textAlignVertical: "top",
    marginBottom: 14,
  },
});
