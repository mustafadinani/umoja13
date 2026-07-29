import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { COLLECTIONS, VOLUNTEER_TASK_TYPES, type VolunteerTask } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { sendVolunteerTaskMessage } from "../lib/callables";
import { Modal, Pill, PrimaryButton } from "./ui";

/** Full shift detail — status actions plus a Q&A thread scoped to this one task, so staff always know exactly which shift a question is about. */
export function VolunteerTaskDetailModal({ task, onClose }: { task: VolunteerTask; onClose: () => void }) {
  const { profile } = useAuth();
  const [reason, setReason] = useState(task.cantMakeReason ?? "");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;
  const isAssignee = profile?.uid === task.assigneeUid;
  const canPost = isStaff || isAssignee;
  const messages = [...(task.messages ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  const typeLabel = VOLUNTEER_TASK_TYPES.find((t) => t.id === task.type)?.label ?? task.type;

  async function markDone() {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), { done: !task.done });
  }

  async function flagCantMake() {
    await updateDoc(doc(db, COLLECTIONS.volunteerTasks, task.id), {
      cantMake: !task.cantMake,
      cantMakeReason: !task.cantMake ? reason : "",
    });
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendVolunteerTaskMessage({ taskId: task.id, text: draft });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible onClose={onClose}>
      <Text style={{ fontWeight: "800", fontSize: 19, marginBottom: 4 }}>{task.title}</Text>
      <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14 }}>
        {typeLabel} · {task.time} · {task.location}
      </Text>

      <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
        {task.done && <Pill bg={theme.color.successBg} fg={theme.color.success}>Done</Pill>}
        {task.cantMake && <Pill bg={theme.color.dangerBg} fg={theme.color.danger}>Can't make it</Pill>}
        {!task.done && !task.cantMake && <Pill bg="#F1EFF5" fg={theme.color.textMuted}>Upcoming</Pill>}
      </View>

      {isAssignee && (
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity onPress={markDone} style={styles.actionBtn}>
            <Text style={{ fontWeight: "700", fontSize: 13 }}>{task.done ? "Mark not done" : "Mark done"}</Text>
          </TouchableOpacity>

          {!task.cantMake && (
            <TextInput
              placeholder="Reason for not making it (optional)"
              value={reason}
              onChangeText={setReason}
              style={[styles.input, { marginTop: 8 }]}
            />
          )}
          <TouchableOpacity
            onPress={flagCantMake}
            style={[styles.actionBtn, { marginTop: 8, backgroundColor: task.cantMake ? theme.color.dangerBg : "transparent" }]}
          >
            <Text style={{ fontWeight: "700", fontSize: 13, color: task.cantMake ? theme.color.danger : theme.color.text }}>
              {task.cantMake ? "I can make it after all" : "Can't make it"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={{ fontWeight: "800", fontSize: 14, marginBottom: 10 }}>QUESTIONS ABOUT THIS SHIFT</Text>
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
        {messages.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13 }}>No questions yet.</Text>}
      </View>

      {canPost ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Ask a question about this shift…" style={[styles.input, { flex: 1 }]} />
          <PrimaryButton disabled={sending || !draft.trim()} onPress={send}>Send</PrimaryButton>
        </View>
      ) : (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>Only this shift's volunteer and organizers can post here.</Text>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionBtn: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  input: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13 },
  bubble: { borderRadius: 10, padding: 10, maxWidth: "85%" },
});
