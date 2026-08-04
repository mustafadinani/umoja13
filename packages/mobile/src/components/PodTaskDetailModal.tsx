import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, type PodTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { sendPodTaskMessage } from "../lib/callables";
import { Modal, Pill, PrimaryButton } from "./ui";

function formatDueDate(dueDate: string): string {
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Full pod-task detail — a done toggle plus a discussion thread scoped to this one task, open to any pod member (unlike a shift's assignee-only Q&A). */
export function PodTaskDetailModal({ task, canPost, onClose }: { task: PodTask; canPost: boolean; onClose: () => void }) {
  const { profile } = useAuth();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const messages = [...(task.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);

  async function toggleDone() {
    await updateDoc(doc(db, COLLECTIONS.podTasks, task.id), { done: !task.done });
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendPodTaskMessage({ taskId: task.id, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 19, marginBottom: 4 }}>{task.title}</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14 }}>
        {[task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : null, task.assigneeName].filter(Boolean).join(" · ") || "No due date"}
      </Text>

      <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
        {task.done ? (
          <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>
        ) : (
          <Pill bg="#F1EFF5" fg={theme.color.textMuted}>Not done</Pill>
        )}
      </View>

      {canPost && (
        <TouchableOpacity onPress={toggleDone} style={[styles.actionBtn, { marginBottom: 20 }]}>
          <Text style={{ fontWeight: "700", fontSize: 13 }}>{task.done ? "Mark not done" : "Mark done"}</Text>
        </TouchableOpacity>
      )}

      <Text style={{ fontWeight: "800", fontSize: 14, marginBottom: 10 }}>COMMENTS</Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              { alignSelf: m.authorUid === profile?.uid ? "flex-end" : "flex-start", backgroundColor: m.authorUid === profile?.uid ? theme.color.navy : "#F1EFF5" },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", opacity: 0.8, marginBottom: 2, color: m.authorUid === profile?.uid ? "#fff" : theme.color.textMuted }}>
              {m.authorName}
            </Text>
            <Text style={{ fontSize: 13.5, color: m.authorUid === profile?.uid ? "#fff" : theme.color.text }}>{m.text}</Text>
          </View>
        ))}
        {messages.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>No comments yet.</Text>}
      </View>

      {canPost ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Add a comment…" style={[styles.input, { flex: 1 }]} />
          <PrimaryButton disabled={sending || !draft.trim()} onPress={send}>Send</PrimaryButton>
        </View>
      ) : (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only this pod's members and organizers can post here.</Text>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionBtn: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  input: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13 },
  bubble: { borderRadius: 10, padding: 10, maxWidth: "85%" },
});
