import { useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  CATEGORIES,
  COMPLAINT_TYPE_LABELS,
  compareGamesByKickoff,
  formatKickoffTime,
  TOURNAMENT_DAY_DATES,
  type ComplaintType,
  type Game,
} from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { createReportFeeIntent, filePaidReport } from "../lib/callables";
import { useGames, useMyIncidents, useTeams } from "../hooks/useData";
import { Card, IncidentStatusPill, Pill, PrimaryButton } from "../components/ui";
import { StripePaymentForm } from "../components/StripePaymentForm";

const DAYS: { id: Game["day"]; label: string }[] = [
  { id: "fri", label: `Fri ${TOURNAMENT_DAY_DATES.fri}` },
  { id: "sat", label: `Sat ${TOURNAMENT_DAY_DATES.sat}` },
  { id: "sun", label: `Sun ${TOURNAMENT_DAY_DATES.sun}` },
];

function callableMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

const TYPE_META: Record<ComplaintType, { icon: string; hint: string }> = {
  ineligible_player: { icon: "🧑‍⚖️", hint: "Report a specific player you believe shouldn't be eligible to play." },
  game_related: { icon: "🥅", hint: "Report something that happened during a specific game." },
  other: { icon: "✉️", hint: "Anything else you need the commissioner to look at." },
};

type Step = "type" | "details" | "pay" | "done";

interface PlayerChoice {
  playerKey: string;
  playerName: string;
  teamId: string;
  teamName: string;
  categoryId: string;
}

export function ComplaintScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Complaint">) {
  const { user, profile } = useAuth();
  const { data: teams } = useTeams();
  const { data: games } = useGames();
  const { data: myIncidents } = useMyIncidents(user?.uid);

  const [step, setStep] = useState<Step>("type");
  const [complaintType, setComplaintType] = useState<ComplaintType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerChoice | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);

  const canContinue =
    (complaintType === "ineligible_player" && !!selectedPlayer && text.trim().length >= 3) ||
    (complaintType === "game_related" && !!selectedGameId && text.trim().length >= 3) ||
    (complaintType === "other" && text.trim().length >= 3);

  function pickType(t: ComplaintType) {
    setComplaintType(t);
    setSelectedPlayer(null);
    setSelectedGameId(null);
    setText("");
    setError(null);
    setStep("details");
  }

  async function continueToPayment() {
    if (!profile || !canContinue) return;
    setBusy(true);
    setError(null);
    try {
      const intent = await createReportFeeIntent({});
      setClientSecret(intent.data.clientSecret);
      setPublishableKey(intent.data.publishableKey);
      setPaymentIntentId(intent.data.paymentIntentId);
      setStep("pay");
    } catch (e) {
      setError(callableMessage(e, "Couldn't start payment."));
    } finally {
      setBusy(false);
    }
  }

  async function onCardPaid() {
    if (!profile || !paymentIntentId || !complaintType) return;
    setBusy(true);
    setError(null);
    try {
      const filed = await filePaidReport({
        text,
        filedByName: profile.displayName,
        filedByRole: profile.primaryRole,
        paymentIntentId,
        source: "fan_message",
        complaintType,
        gameId: complaintType === "game_related" ? (selectedGameId ?? undefined) : undefined,
        playerKey: complaintType === "ineligible_player" ? selectedPlayer?.playerKey : undefined,
        playerName: complaintType === "ineligible_player" ? selectedPlayer?.playerName : undefined,
        playerTeamId: complaintType === "ineligible_player" ? selectedPlayer?.teamId : undefined,
        playerCategoryId: complaintType === "ineligible_player" ? selectedPlayer?.categoryId : undefined,
      });
      setCaseNumber(filed.data.caseNumber);
      setConfirmationId(filed.data.stripeConfirmationId);
      setStep("done");
    } catch (e) {
      setError(callableMessage(e, "Payment succeeded but filing the case failed. Contact support with your payment receipt."));
    } finally {
      setBusy(false);
    }
  }

  const myReports = (
    <View style={{ marginTop: 28 }}>
      <Text style={styles.sectionTitle}>MY REPORTS</Text>
      <View style={{ gap: 8 }}>
        {myIncidents.map((i) => (
          <Card key={i.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <Text style={{ fontWeight: "700", fontSize: 13.5 }}>
                  #{i.caseNumber} · {i.complaintType ? COMPLAINT_TYPE_LABELS[i.complaintType] : "Report"}
                </Text>
                <Text style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {new Date(i.createdAt).toLocaleDateString()} · {i.text.slice(0, 90)}
                </Text>
              </View>
              <IncidentStatusPill status={i.status} />
            </View>
            {i.resolution && (
              <View style={styles.responseBox}>
                <Text style={styles.responseLabel}>COMMISSIONER'S RESPONSE</Text>
                <Text style={{ fontSize: 13 }}>{i.resolution.response}</Text>
              </View>
            )}
          </Card>
        ))}
        {myIncidents.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13.5 }}>You haven't filed any reports yet.</Text>}
      </View>
    </View>
  );

  if (step === "done" && caseNumber) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }}>
        <View style={styles.doneWrap}>
          <Text style={{ fontSize: 40 }}>✓</Text>
          <Text style={styles.h1}>We've got it.</Text>
          <Text style={styles.sub}>Case #{caseNumber} is with the Commissioner. Payment confirmed.</Text>
          {confirmationId && <Text style={styles.conf}>Stripe confirmation: {confirmationId}</Text>}
          <PrimaryButton onPress={() => navigation.goBack()} style={{ marginTop: 20, width: "100%" }}>
            DONE
          </PrimaryButton>
        </View>
        {myReports}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.bg, padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Report an issue</Text>
      <Text style={styles.sub}>
        {step === "type" && "Choose what this is about, then describe it. There's a $35 review fee once you continue to payment."}
        {step === "details" && "Give the commissioner what they need to look into this."}
        {step === "pay" && "Enter your card details below. Your case is filed only after payment succeeds."}
      </Text>

      {step === "type" && (
        <View style={{ gap: 10 }}>
          {(Object.keys(COMPLAINT_TYPE_LABELS) as ComplaintType[]).map((t) => (
            <Card key={t} onPress={() => pickType(t)}>
              <Text style={{ fontWeight: "700", fontSize: 15 }}>
                {TYPE_META[t].icon} {COMPLAINT_TYPE_LABELS[t]}
              </Text>
              <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginTop: 4 }}>{TYPE_META[t].hint}</Text>
            </Card>
          ))}
        </View>
      )}

      {step === "details" && complaintType && (
        <>
          <TouchableOpacity onPress={() => setStep("type")}>
            <Text style={styles.backLink}>← Change issue type</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: "700", fontSize: 14, marginBottom: 10 }}>
            {TYPE_META[complaintType].icon} {COMPLAINT_TYPE_LABELS[complaintType]}
          </Text>

          {complaintType === "ineligible_player" && (
            <PlayerSearchPicker teams={teams} selected={selectedPlayer} onSelect={setSelectedPlayer} />
          )}
          {complaintType === "game_related" && (
            <GameSearchPicker games={games} teams={teams} selectedGameId={selectedGameId} onSelect={setSelectedGameId} />
          )}

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={complaintType === "other" ? "Tell us what happened…" : "Explain why you think there's a problem…"}
            multiline
            numberOfLines={5}
            style={styles.textarea}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton disabled={!canContinue || busy} onPress={() => void continueToPayment()} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : "CONTINUE TO PAYMENT"}
          </PrimaryButton>
        </>
      )}

      {step === "pay" && clientSecret && publishableKey && (
        <>
          {error && <Text style={styles.error}>{error}</Text>}
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaid={onCardPaid}
            onError={setError}
          />
          {busy && <Text style={[styles.sub, { marginTop: 12 }]}>Filing your case…</Text>}
        </>
      )}

      {step === "type" && myReports}
    </ScrollView>
  );
}

function PlayerSearchPicker({
  teams,
  selected,
  onSelect,
}: {
  teams: { id: string; name: string; categoryId: string; roster: { playerKey?: string; userId: string; displayName: string }[] }[];
  selected: PlayerChoice | null;
  onSelect: (p: PlayerChoice | null) => void;
}) {
  const [search, setSearch] = useState("");

  const allPlayers = useMemo(
    () =>
      teams.flatMap((t) =>
        t.roster.map((p) => ({
          playerKey: p.playerKey ?? p.userId,
          playerName: p.displayName,
          teamId: t.id,
          teamName: t.name,
          categoryId: t.categoryId,
        }))
      ),
    [teams]
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allPlayers.filter((p) => p.playerName.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q)).slice(0, 20);
  }, [allPlayers, search]);

  if (selected) {
    return (
      <View style={{ marginBottom: 14 }}>
        <View style={styles.pickedRow}>
          <View>
            <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{selected.playerName}</Text>
            <Text style={{ fontSize: 12, color: theme.color.textMuted }}>
              {selected.teamName} · {CATEGORIES.find((c) => c.id === selected.categoryId)?.label}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onSelect(null)}>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search for the player by name…" style={styles.searchInput} />
      {results.map((p) => (
        <TouchableOpacity key={`${p.teamId}-${p.playerKey}`} onPress={() => onSelect(p)} style={styles.resultRow}>
          <Text style={{ fontWeight: "600" }}>
            {p.playerName} <Text style={{ color: theme.color.textMuted, fontWeight: "400" }}>— {p.teamName} · {CATEGORIES.find((c) => c.id === p.categoryId)?.label}</Text>
          </Text>
        </TouchableOpacity>
      ))}
      {search.trim().length > 0 && results.length === 0 && (
        <Text style={{ color: theme.color.textMuted, fontSize: 12.5, marginTop: 8 }}>No matching players found.</Text>
      )}
    </View>
  );
}

function GameSearchPicker({
  games,
  teams,
  selectedGameId,
  onSelect,
}: {
  games: Game[];
  teams: { id: string; name: string }[];
  selectedGameId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [day, setDay] = useState<Game["day"] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "TBD";

  // Same chronological order as the Schedule tab — the raw Firestore read
  // has no inherent order, so without this the list reads as shuffled.
  const sortedGames = useMemo(() => [...games].sort(compareGamesByKickoff), [games]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedGames.filter((g) => {
      if (day && g.day !== day) return false;
      if (categoryId && g.categoryId !== categoryId) return false;
      if (q) {
        const category = CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? "";
        const haystack = `${teamName(g.homeTeamId)} ${teamName(g.awayTeamId)} ${g.field} ${category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedGames, search, day, categoryId, teams]);

  const selected = games.find((g) => g.id === selectedGameId) ?? null;

  if (selected) {
    return (
      <View style={{ marginBottom: 14 }}>
        <View style={styles.pickedRow}>
          <View>
            <Text style={{ fontWeight: "700", fontSize: 13.5 }}>
              {teamName(selected.homeTeamId)} vs {teamName(selected.awayTeamId)}
            </Text>
            <Text style={{ fontSize: 12, color: theme.color.textMuted }}>
              {CATEGORIES.find((c) => c.id === selected.categoryId)?.label} · {selected.field} · {selected.day.toUpperCase()}{" "}
              {formatKickoffTime(selected.kickoffTime)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onSelect("")}>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by team, category, or field…"
        style={styles.searchInput}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 6 }}>
        <Pill active={!day} onPress={() => setDay(null)}>All days</Pill>
        {DAYS.map((d) => (
          <Pill key={d.id} active={day === d.id} onPress={() => setDay(day === d.id ? null : d.id)}>
            {d.label}
          </Pill>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 8 }}>
        <Pill active={!categoryId} onPress={() => setCategoryId(null)}>All categories</Pill>
        {CATEGORIES.map((c) => (
          <Pill key={c.id} active={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}>
            {c.label}
          </Pill>
        ))}
      </ScrollView>
      {results.map((g) => (
        <TouchableOpacity key={g.id} onPress={() => onSelect(g.id)} style={styles.resultRow}>
          <Text style={{ fontWeight: "600" }}>
            {teamName(g.homeTeamId)} vs {teamName(g.awayTeamId)}{" "}
            <Text style={{ color: theme.color.textMuted, fontWeight: "400" }}>
              — {CATEGORIES.find((c) => c.id === g.categoryId)?.label} · {g.field} · {g.day.toUpperCase()} {formatKickoffTime(g.kickoffTime)}
            </Text>
          </Text>
        </TouchableOpacity>
      ))}
      {results.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No games found.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontWeight: "800", fontSize: 20, marginBottom: 6, textAlign: "center" },
  sub: { color: theme.color.textMuted, fontSize: 13, marginBottom: 14, textAlign: "center" },
  conf: { color: theme.color.textMuted, fontSize: 11, marginTop: 8, textAlign: "center" },
  sectionTitle: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  backLink: { color: theme.color.blue, fontWeight: "600", fontSize: 13, marginBottom: 14 },
  changeLink: { color: theme.color.blue, fontWeight: "700", fontSize: 12.5 },
  textarea: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 13.5,
    minHeight: 110,
    textAlignVertical: "top",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: 13.5,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  resultRow: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  pickedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.color.purple,
    backgroundColor: "#F5F3FA",
  },
  responseBox: { marginTop: 10, backgroundColor: "#F7F6F3", borderRadius: theme.radius.sm, padding: 10 },
  responseLabel: { fontWeight: "700", fontSize: 11, color: theme.color.textMuted, marginBottom: 4, letterSpacing: 0.5 },
  error: { color: theme.color.danger, fontSize: 13, marginBottom: 10, textAlign: "center" },
  doneWrap: { alignItems: "center", justifyContent: "center", padding: 20 },
});
