import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  CATEGORIES,
  COMPLAINT_TYPE_LABELS,
  compareGamesByKickoff,
  formatKickoffTime,
  GAME_FIELDS,
  TOURNAMENT_DAY_DATES,
  type ComplaintType,
  type Game,
} from "@umoja/shared";
import { theme } from "../../lib/theme";
import { createReportFeeIntent, filePaidReport } from "../../lib/callables";
import { useAuth } from "../../auth/AuthProvider";
import { useGames, useMyIncidents, useTeams } from "../../hooks/useData";
import { Card, FilterDropdown, IncidentStatusPill, PrimaryButton } from "../../components/ui";
import { StripePaymentForm } from "../../components/StripePaymentForm";

const DAYS: { id: Game["day"]; label: string }[] = [
  { id: "fri", label: `Fri, ${TOURNAMENT_DAY_DATES.fri}` },
  { id: "sat", label: `Sat, ${TOURNAMENT_DAY_DATES.sat}` },
  { id: "sun", label: `Sun, ${TOURNAMENT_DAY_DATES.sun}` },
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

/** Full-page report + Stripe card form — same flow as mobile ComplaintScreen. */
export function ReportIssuePage() {
  const navigate = useNavigate();
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

  const myReportsSection = (
    <div style={{ marginTop: 36 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MY REPORTS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {myIncidents.map((i) => (
          <Card key={i.id} style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  #{i.caseNumber} · {i.complaintType ? COMPLAINT_TYPE_LABELS[i.complaintType] : "Report"}
                </div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {new Date(i.createdAt).toLocaleDateString()} · {i.text.slice(0, 90)}
                </div>
              </div>
              <IncidentStatusPill status={i.status} />
            </div>
            {i.resolution && (
              <div style={{ marginTop: 10, background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 10, fontSize: 13 }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: theme.color.textMuted, marginBottom: 4, letterSpacing: 0.5 }}>
                  COMMISSIONER'S RESPONSE
                </div>
                {i.resolution.response}
              </div>
            )}
          </Card>
        ))}
        {myIncidents.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>You haven't filed any reports yet.</div>
        )}
      </div>
    </div>
  );

  if (step === "done" && caseNumber) {
    return (
      <div style={doneWrap}>
        <div style={{ fontSize: 40 }}>✓</div>
        <div style={titleStyle}>We've got it.</div>
        <div style={subStyle}>Case #{caseNumber} is with the Commissioner. Payment confirmed.</div>
        {confirmationId && <div style={{ ...subStyle, fontSize: 12, wordBreak: "break-all" }}>Stripe confirmation: {confirmationId}</div>}
        <PrimaryButton style={{ marginTop: 20, width: "100%" }} onClick={() => navigate("/dashboard")}>
          DONE
        </PrimaryButton>
        <div style={{ textAlign: "left" }}>{myReportsSection}</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button type="button" onClick={() => navigate("/dashboard")} style={backStyle}>
        ← Dashboard
      </button>
      <div style={titleStyle}>Report an issue</div>
      <div style={subStyle}>
        {step === "type" && "Choose what this is about, then describe it. There's a $35 review fee once you continue to payment."}
        {step === "details" && "Give the commissioner what they need to look into this."}
        {step === "pay" && "Enter your card details below. Your case is filed only after payment succeeds."}
      </div>

      {step === "type" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(Object.keys(COMPLAINT_TYPE_LABELS) as ComplaintType[]).map((t) => (
            <Card key={t} onClick={() => pickType(t)} style={{ cursor: "pointer", padding: "16px 18px" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {TYPE_META[t].icon} {COMPLAINT_TYPE_LABELS[t]}
              </div>
              <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginTop: 4 }}>{TYPE_META[t].hint}</div>
            </Card>
          ))}
        </div>
      )}

      {step === "details" && complaintType && (
        <>
          <button type="button" onClick={() => setStep("type")} style={backStyle}>
            ← Change issue type
          </button>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            {TYPE_META[complaintType].icon} {COMPLAINT_TYPE_LABELS[complaintType]}
          </div>

          {complaintType === "ineligible_player" && (
            <PlayerSearchPicker teams={teams} selected={selectedPlayer} onSelect={setSelectedPlayer} />
          )}
          {complaintType === "game_related" && (
            <GameSearchPicker games={games} teams={teams} selectedGameId={selectedGameId} onSelect={setSelectedGameId} />
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              complaintType === "other" ? "Tell us what happened…" : "Explain why you think there's a problem…"
            }
            rows={5}
            style={textareaStyle}
          />
          {error && <div style={errorStyle}>{error}</div>}
          <PrimaryButton disabled={!canContinue || busy} onClick={() => void continueToPayment()} style={{ width: "100%" }}>
            {busy ? "Preparing payment…" : "CONTINUE TO PAYMENT"}
          </PrimaryButton>
        </>
      )}

      {step === "pay" && clientSecret && publishableKey && (
        <>
          {error && <div style={errorStyle}>{error}</div>}
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onPaid={() => void onCardPaid()}
            onError={setError}
          />
          {busy && <div style={{ ...subStyle, marginTop: 12 }}>Filing your case…</div>}
        </>
      )}

      {step === "type" && myReportsSection}
    </div>
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
      <div style={{ marginBottom: 14 }}>
        <div style={pickedRowStyle}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{selected.playerName}</div>
            <div style={{ fontSize: 12, color: theme.color.textMuted }}>
              {selected.teamName} · {CATEGORIES.find((c) => c.id === selected.categoryId)?.label}
            </div>
          </div>
          <button type="button" onClick={() => onSelect(null)} style={changeLinkStyle}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search for the player by name…"
        style={searchInputStyle}
      />
      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, maxHeight: 220, overflowY: "auto" }}>
          {results.map((p) => (
            <button key={`${p.teamId}-${p.playerKey}`} type="button" onClick={() => onSelect(p)} style={resultRowStyle}>
              <span style={{ fontWeight: 600 }}>{p.playerName}</span>
              <span style={{ color: theme.color.textMuted, fontSize: 12 }}>
                {" "}
                — {p.teamName} · {CATEGORIES.find((c) => c.id === p.categoryId)?.label}
              </span>
            </button>
          ))}
        </div>
      )}
      {search.trim().length > 0 && results.length === 0 && (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginTop: 8 }}>No matching players found.</div>
      )}
    </div>
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
  const [field, setField] = useState<string | null>(null);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "TBD";

  const categoryOptions = useMemo(() => CATEGORIES.map((c) => ({ id: c.id, label: c.label })), []);
  const fieldOptions = useMemo(() => GAME_FIELDS.map((f) => ({ id: f, label: f })), []);

  // Same chronological order as Game Day's Schedule tab — the raw Firestore
  // read has no inherent order, so without this the list reads as shuffled.
  const sortedGames = useMemo(() => [...games].sort(compareGamesByKickoff), [games]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedGames.filter((g) => {
      if (day && g.day !== day) return false;
      if (categoryId && g.categoryId !== categoryId) return false;
      if (field && g.field !== field) return false;
      if (q) {
        const category = CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? "";
        const haystack = `${teamName(g.homeTeamId)} ${teamName(g.awayTeamId)} ${g.field} ${category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedGames, search, day, categoryId, field, teams]);

  const selected = games.find((g) => g.id === selectedGameId) ?? null;
  const hasFilters = !!(day || categoryId || field);

  if (selected) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={pickedRowStyle}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {teamName(selected.homeTeamId)} vs {teamName(selected.awayTeamId)}
            </div>
            <div style={{ fontSize: 12, color: theme.color.textMuted }}>
              {CATEGORIES.find((c) => c.id === selected.categoryId)?.label} · {selected.field} · {selected.day.toUpperCase()}{" "}
              {formatKickoffTime(selected.kickoffTime)}
            </div>
          </div>
          <button type="button" onClick={() => onSelect("")} style={changeLinkStyle}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by team, category, or field…"
        style={{ ...searchInputStyle, marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: hasFilters ? 6 : 8 }}>
        <FilterDropdown<Game["day"]> label="Day" value={day} options={DAYS} onChange={setDay} />
        <FilterDropdown label="Category" value={categoryId} options={categoryOptions} onChange={setCategoryId} />
        <FilterDropdown label="Field" value={field} options={fieldOptions} onChange={setField} />
      </div>
      {hasFilters && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {day && <FilterChip label={DAYS.find((d) => d.id === day)?.label ?? day} onRemove={() => setDay(null)} />}
          {categoryId && (
            <FilterChip label={CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId} onRemove={() => setCategoryId(null)} />
          )}
          {field && <FilterChip label={field} onRemove={() => setField(null)} />}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
        {results.map((g) => (
          <button key={g.id} type="button" onClick={() => onSelect(g.id)} style={resultRowStyle}>
            <span style={{ fontWeight: 600 }}>
              {teamName(g.homeTeamId)} vs {teamName(g.awayTeamId)}
            </span>
            <span style={{ color: theme.color.textMuted, fontSize: 12 }}>
              {" "}
              — {CATEGORIES.find((c) => c.id === g.categoryId)?.label} · {g.field} · {g.day.toUpperCase()} {formatKickoffTime(g.kickoffTime)}
            </span>
          </button>
        ))}
        {results.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No games found.</div>}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div
      onClick={onRemove}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#F1EFF5",
        color: theme.color.purple,
        padding: "5px 6px 5px 12px",
        borderRadius: theme.radius.pill,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(139,47,209,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✕</span>
    </div>
  );
}

const pageStyle = {
  maxWidth: 520,
  margin: "0 auto",
  padding: "24px 16px 48px",
  width: "100%",
} as const;

const doneWrap = {
  maxWidth: 520,
  margin: "0 auto",
  padding: "48px 24px",
  textAlign: "center" as const,
};

const titleStyle = {
  fontFamily: theme.font.display,
  fontWeight: 800,
  fontSize: 28,
  marginBottom: 8,
} as const;

const subStyle = {
  color: theme.color.textMuted,
  fontSize: 14,
  marginBottom: 18,
  lineHeight: 1.45,
} as const;

const textareaStyle = {
  width: "100%",
  padding: 12,
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.color.border}`,
  fontSize: 14,
  resize: "vertical" as const,
  marginBottom: 14,
  boxSizing: "border-box" as const,
  minHeight: 120,
};

const searchInputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.color.border}`,
  fontSize: 14,
  boxSizing: "border-box" as const,
};

const resultRowStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.color.border}`,
  background: "#fff",
  fontSize: 13.5,
  cursor: "pointer",
};

const pickedRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${theme.color.purple}`,
  background: "#F5F3FA",
};

const changeLinkStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: theme.color.blue,
  fontWeight: 700,
  fontSize: 12.5,
  cursor: "pointer",
  padding: 0,
};

const errorStyle = {
  color: theme.color.danger,
  fontSize: 13,
  marginBottom: 12,
} as const;

const backStyle = {
  background: "none",
  border: "none",
  color: theme.color.blue,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
  marginBottom: 16,
} as const;
