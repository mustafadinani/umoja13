import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { CATEGORIES, COLLECTIONS, GAME_FIELDS, fieldCluster, formatKickoffTime, podForField, type Game } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { usePods, useReferees, useTeams } from "../../../hooks/useData";
import { Modal, Pill, PrimaryButton } from "../../../components/ui";

const DAYS: { id: Game["day"]; label: string }[] = [
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
  { id: "sun", label: "Sunday" },
];

// Manually-added games always have both teams picked directly, so they never need
// a matchCode/bracket/ref — round is offered mainly so a make-up or rescheduled
// knockout game can be tagged correctly for display, not to wire it into the
// bracket resolver (which only ever acts on matchCode/homeRef/awayRef).
const ROUNDS: { id: Game["round"]; label: string }[] = [
  { id: "group", label: "Group stage" },
  { id: "wildcard", label: "Wild card" },
  { id: "qf", label: "Quarter-final" },
  { id: "sf", label: "Semi-final" },
  { id: "final", label: "Final" },
];

export function AddGameModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);
  const [day, setDay] = useState<Game["day"] | null>(null);
  const [kickoffTime, setKickoffTime] = useState("10:00");
  const [field, setField] = useState<string | null>(null);
  const [round, setRound] = useState<Game["round"]>("group");
  const [refereeUids, setRefereeUids] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: teams } = useTeams(categoryId ?? undefined);
  const { data: referees } = useReferees();
  const { data: pods } = usePods();

  async function submit() {
    if (!categoryId || !homeTeamId || !awayTeamId || !day || !field) return;
    setBusy(true);
    try {
      await addDoc(collection(db, COLLECTIONS.games), {
        categoryId,
        day,
        kickoffTime,
        field,
        podId: podForField(pods, fieldCluster(field)) ?? null,
        homeTeamId,
        awayTeamId,
        status: "scheduled",
        round,
        refereeUids,
        gateCheck: { homeClearedUids: [], awayClearedUids: [] },
        events: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Add a game</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>Step {step} of 4</div>

      {step === 1 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Category</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {CATEGORIES.map((c) => (
              <Pill key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setHomeTeamId(null); setAwayTeamId(null); }}>{c.label}</Pill>
            ))}
          </div>
          <PrimaryButton disabled={!categoryId} onClick={() => setStep(2)} style={{ width: "100%" }}>NEXT</PrimaryButton>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Home team</div>
          <div data-testid="home-team-picker" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {teams.filter((t) => t.id !== awayTeamId).map((t) => (
              <Pill key={t.id} active={homeTeamId === t.id} onClick={() => setHomeTeamId(t.id)} bg={homeTeamId === t.id ? t.color : undefined}>{t.name}</Pill>
            ))}
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Away team</div>
          <div data-testid="away-team-picker" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {teams.filter((t) => t.id !== homeTeamId).map((t) => (
              <Pill key={t.id} active={awayTeamId === t.id} onClick={() => setAwayTeamId(t.id)} bg={awayTeamId === t.id ? t.color : undefined}>{t.name}</Pill>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "12px 16px", fontWeight: 700 }}>Back</button>
            <PrimaryButton disabled={!homeTeamId || !awayTeamId} onClick={() => setStep(3)} style={{ flex: 1 }}>NEXT</PrimaryButton>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Day</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {DAYS.map((d) => <Pill key={d.id} active={day === d.id} onClick={() => setDay(d.id)}>{d.label}</Pill>)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Kickoff time</div>
          <select value={kickoffTime} onChange={(e) => setKickoffTime(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 16 }}>
            {["08:00", "09:00", "10:00", "10:40", "11:30", "12:20", "13:10", "14:00", "15:00", "16:00"].map((t) => <option key={t} value={t}>{formatKickoffTime(t)}</option>)}
          </select>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Field</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {GAME_FIELDS.map((f) => <Pill key={f} active={field === f} onClick={() => setField(f)}>{f}</Pill>)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Round</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {ROUNDS.map((r) => <Pill key={r.id} active={round === r.id} onClick={() => setRound(r.id)}>{r.label}</Pill>)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(2)} style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "12px 16px", fontWeight: 700 }}>Back</button>
            <PrimaryButton disabled={!day || !field} onClick={() => setStep(4)} style={{ flex: 1 }}>NEXT</PrimaryButton>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Referees (optional — pick more than one for a double-ref game)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {referees.map((r) => (
              <Pill
                key={r.uid}
                active={refereeUids.includes(r.uid)}
                onClick={() => setRefereeUids((prev) => (prev.includes(r.uid) ? prev.filter((u) => u !== r.uid) : [...prev, r.uid]))}
              >
                {r.displayName}
              </Pill>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(3)} style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "12px 16px", fontWeight: 700 }}>Back</button>
            <PrimaryButton disabled={busy} onClick={submit} style={{ flex: 1 }}>{busy ? "Creating…" : "CREATE GAME"}</PrimaryButton>
          </div>
        </>
      )}
    </Modal>
  );
}
