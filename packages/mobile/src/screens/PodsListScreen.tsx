import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { colorForSeed } from "../lib/podColors";
import { useMyPods } from "../hooks/useData";
import { listOpenPods, joinPod } from "../lib/callables";
import { PrimaryButton } from "../components/ui";

/** All the pods you're on, plus open ones you can self-join — the "See all" destination from the Hub hero card. */
export function PodsListScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Pods">) {
  const { user } = useAuth();
  const { data: myPods } = useMyPods(user?.uid);
  const [openPods, setOpenPods] = useState<{ id: string; name: string; memberCount: number }[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedMyPods = [...myPods].sort((a, b) => (a.isGeneral ? 1 : b.isGeneral ? -1 : a.name.localeCompare(b.name)));

  useEffect(() => {
    listOpenPods({})
      .then((res) => setOpenPods(res.data.pods))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load open pods."));
  }, []);

  async function join(podId: string) {
    setBusyId(podId);
    setError(null);
    try {
      await joinPod({ podId });
      setOpenPods((prev) => prev?.filter((p) => p.id !== podId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join this pod.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg }} contentContainerStyle={{ padding: 14, paddingBottom: 48 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.color.textMuted, letterSpacing: 0.4, marginBottom: 8 }}>MY PODS</Text>
      {sortedMyPods.length === 0 && (
        <Text style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>Not on a pod yet — join one below.</Text>
      )}
      {sortedMyPods.map((p) => (
        <TouchableOpacity
          key={p.id}
          onPress={() => navigation.navigate("PodDetail", { podId: p.id })}
          style={{
            flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.color.border,
            borderRadius: theme.radius.lg, padding: 12, marginBottom: 8,
          }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colorForSeed(p.id), alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16 }}>{p.isGeneral ? "🌐" : "📍"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{p.name}</Text>
            <Text style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 1 }}>{p.memberUids.length} {p.memberUids.length === 1 ? "person" : "people"}</Text>
          </View>
          <Text style={{ color: theme.color.textMuted, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      ))}

      {openPods && openPods.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: theme.color.textMuted, letterSpacing: 0.4, marginBottom: 4 }}>OPEN PODS</Text>
          <Text style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 8 }}>Join a pod you're not on yet — no approval needed.</Text>
          {error && <Text style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 8 }}>{error}</Text>}
          {openPods.map((p) => (
            <View
              key={p.id}
              style={{
                flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: theme.color.border,
                borderRadius: theme.radius.lg, padding: 12, marginBottom: 8,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colorForSeed(p.id), alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{p.name}</Text>
                <Text style={{ color: theme.color.textMuted, fontSize: 11.5, marginTop: 1 }}>{p.memberCount} {p.memberCount === 1 ? "person" : "people"}</Text>
              </View>
              <PrimaryButton disabled={busyId === p.id} onPress={() => join(p.id)} style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                {busyId === p.id ? "…" : "JOIN"}
              </PrimaryButton>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
