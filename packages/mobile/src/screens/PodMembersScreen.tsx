import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { colorForSeed } from "../lib/podColors";
import { usePod } from "../hooks/useData";
import { addPodVolunteer, getPodMemberNames, getRecruitableVolunteers, lookupUserByEmail, updatePod } from "../lib/callables";
import { Avatar, PrimaryButton } from "../components/ui";

function looksLikeEmail(s: string) {
  return /\S+@\S+\.\S+/.test(s.trim());
}

/**
 * Search/suggest/add/remove for one pod's roster — the mobile counterpart to
 * web's AddPodPeopleModal, now a real pushed screen instead of unreachable
 * from a phone at all. Staff can remove; both staff and a pod's own
 * volunteer members can add (addPodVolunteer enforces server-side who a
 * non-staff recruiter is allowed to pull in).
 */
export function PodMembersScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "PodMembers">) {
  const { podId } = route.params;
  const { profile } = useAuth();
  const { data: pod } = usePod(podId);
  const [search, setSearch] = useState("");
  const [emailResult, setEmailResult] = useState<{ uid: string; email: string; displayName: string } | "idle" | "loading" | "notfound">("idle");
  const [candidates, setCandidates] = useState<{ uid: string; displayName: string }[]>([]);
  const [members, setMembers] = useState<{ uid: string; displayName: string }[]>([]);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStaff = profile?.roles?.some((r) => r === "admin" || r === "commissioner") ?? false;

  useEffect(() => {
    if (pod) navigation.setOptions({ title: `Members · ${pod.name}` });
  }, [pod, navigation]);

  function refresh() {
    getPodMemberNames({ podId }).then((res) => setMembers(res.data.members));
    getRecruitableVolunteers({ podId }).then((res) => setCandidates(res.data.candidates)).catch(() => setCandidates([]));
  }

  useEffect(refresh, [podId]);

  async function runEmailLookup() {
    setEmailResult("loading");
    setError(null);
    try {
      const res = await lookupUserByEmail({ email: search.trim() });
      setEmailResult(res.data.user ?? "notfound");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't look up that email.");
      setEmailResult("idle");
    }
  }

  async function addPerson(uid: string) {
    setBusyUid(uid);
    setError(null);
    try {
      await addPodVolunteer({ podId, uidToAdd: uid });
      refresh();
      setSearch("");
      setEmailResult("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this person.");
    } finally {
      setBusyUid(null);
    }
  }

  async function removeMember(uid: string) {
    if (!pod) return;
    setBusyUid(uid);
    try {
      await updatePod({ podId, memberUids: pod.memberUids.filter((u) => u !== uid) });
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove this person.");
    } finally {
      setBusyUid(null);
    }
  }

  const memberUidSet = useMemo(() => new Set(members.map((m) => m.uid)), [members]);
  const term = search.trim().toLowerCase();
  const filteredCandidates = candidates.filter((c) => !memberUidSet.has(c.uid) && c.displayName.toLowerCase().includes(term));
  const emailFound = typeof emailResult === "object" ? emailResult : null;
  const emailAlreadyMember = emailFound ? memberUidSet.has(emailFound.uid) : false;

  if (!pod) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      {error && (
        <View style={{ backgroundColor: theme.color.dangerBg, borderRadius: theme.radius.sm, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: theme.color.danger, fontSize: 12.5, fontWeight: "600" }}>{error}</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput
          value={search}
          onChangeText={(t) => { setSearch(t); setEmailResult("idle"); }}
          placeholder="Search by name, or paste an email…"
          autoCapitalize="none"
          style={{ flex: 1, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm, padding: 11, fontSize: 13.5 }}
        />
        {looksLikeEmail(search) && (
          <TouchableOpacity onPress={runEmailLookup} disabled={emailResult === "loading"} style={{ paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.sm }}>
            <Text style={{ fontSize: 12.5, fontWeight: "700" }}>{emailResult === "loading" ? "…" : "Look up"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {emailFound && (
        <PersonRow
          name={emailFound.displayName}
          sublabel={emailAlreadyMember ? "already added" : emailFound.email}
          busy={busyUid === emailFound.uid}
          added={emailAlreadyMember}
          onAdd={() => addPerson(emailFound.uid)}
        />
      )}
      {emailResult === "notfound" && <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 12 }}>No account found for that email.</Text>}

      {!looksLikeEmail(search) && term && filteredCandidates.length === 0 && (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 12 }}>No volunteers match "{search}".</Text>
      )}
      {!looksLikeEmail(search) && term &&
        filteredCandidates.map((c) => (
          <PersonRow key={c.uid} name={c.displayName} sublabel="registered volunteer" busy={busyUid === c.uid} onAdd={() => addPerson(c.uid)} />
        ))}

      {!term && candidates.filter((c) => !memberUidSet.has(c.uid)).length > 0 && (
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.4, color: theme.color.textMuted, marginBottom: 8 }}>SUGGESTED FOR THIS POD</Text>
          {candidates
            .filter((c) => !memberUidSet.has(c.uid))
            .map((c) => (
              <PersonRow key={c.uid} name={c.displayName} sublabel="registered volunteer, not yet placed" busy={busyUid === c.uid} onAdd={() => addPerson(c.uid)} compact />
            ))}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: theme.color.border, marginVertical: 16 }} />

      <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.4, color: theme.color.textMuted, marginBottom: 10 }}>
        CURRENT MEMBERS ({members.length})
      </Text>
      {members.map((m) => (
        <View key={m.uid} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Avatar name={m.displayName} size={30} color={colorForSeed(m.uid)} />
            <Text style={{ fontSize: 13.5, fontWeight: "600" }}>{m.displayName}</Text>
          </View>
          {isStaff && (
            <TouchableOpacity disabled={busyUid === m.uid} onPress={() => removeMember(m.uid)} style={{ padding: 6 }}>
              <Text style={{ color: theme.color.textMuted, fontSize: 15 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {members.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No one's here yet.</Text>}
    </ScrollView>
  );
}

function PersonRow({
  name, sublabel, busy, added, onAdd, compact,
}: { name: string; sublabel: string; busy: boolean; added?: boolean; onAdd: () => void; compact?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
        paddingVertical: compact ? 6 : 10, paddingHorizontal: compact ? 0 : 12,
        borderRadius: theme.radius.sm, borderWidth: compact ? 0 : 1, borderColor: theme.color.border, marginBottom: 8,
      }}
    >
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{name}</Text>
        <Text style={{ fontSize: 11, color: theme.color.textMuted }} numberOfLines={1}>{sublabel}</Text>
      </View>
      {added ? (
        <Text style={{ fontSize: 11.5, fontWeight: "700", color: theme.color.success }}>Added</Text>
      ) : (
        <PrimaryButton disabled={busy} onPress={onAdd} style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: theme.color.purple }}>
          {busy ? "…" : "+ Add"}
        </PrimaryButton>
      )}
    </View>
  );
}
