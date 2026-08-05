import { useMemo, useRef, useState } from "react";
import { doc, setDoc, addDoc, collection, orderBy } from "firebase/firestore";
import { COLLECTIONS, type UatScenarioProgress, type UatBugReport, type UatSignoff, type UatBugSeverity } from "@umoja/shared";
import { db } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthProvider";
import { useCollection } from "../../hooks/firestore";
import { theme } from "../../lib/theme";
import { Card, PrimaryButton, Pill } from "../../components/ui";
import {
  UAT_SECTIONS,
  UAT_SCENARIOS,
  UAT_DEMO_ACCOUNTS,
  UAT_DEMO_PASSWORD,
  UAT_ROUNDS,
  UAT_ROUND_2_CHANGES,
  CURRENT_UAT_ROUND,
  type UatScenario,
} from "./data";

/** Round 2+ scenario progress lives at a round-suffixed doc id so it never collides with the archived Round 1 doc (bare scenario.id). */
function progressDocId(scenarioId: string, round: number) {
  return round === 1 ? scenarioId : `${scenarioId}__v${round}`;
}

const SEVERITIES: { id: UatBugSeverity; label: string; color: string }[] = [
  { id: "critical", label: "Critical — blocks testing", color: theme.color.danger },
  { id: "major", label: "Major — wrong behavior", color: theme.color.warning },
  { id: "minor", label: "Minor — cosmetic", color: theme.color.textMuted },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.color.border}`,
  fontSize: 13.5,
  fontFamily: "inherit",
};

function ScenarioCard({
  scenario,
  progress,
  round,
  readOnly,
}: {
  scenario: UatScenario;
  progress: UatScenarioProgress | undefined;
  round: number;
  readOnly: boolean;
}) {
  const { user, profile } = useAuth();
  const [notesDraft, setNotesDraft] = useState(progress?.notes ?? "");
  const initializedRef = useRef(false);
  if (!initializedRef.current && progress) {
    initializedRef.current = true;
    setNotesDraft(progress.notes ?? "");
  }

  const done = progress?.done ?? false;

  async function toggleDone(checked: boolean) {
    if (!user || readOnly) return;
    await setDoc(
      doc(db, COLLECTIONS.uatScenarios, progressDocId(scenario.id, round)),
      {
        id: scenario.id,
        round,
        done: checked,
        doneByUid: user.uid,
        doneByName: profile?.displayName ?? "Someone",
        notes: notesDraft,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }

  async function saveNotes() {
    if (!user || readOnly) return;
    await setDoc(
      doc(db, COLLECTIONS.uatScenarios, progressDocId(scenario.id, round)),
      { id: scenario.id, round, notes: notesDraft, updatedAt: Date.now() },
      { merge: true }
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${theme.color.border}`,
        background: "#fff",
        borderRadius: theme.radius.lg,
        padding: "18px 20px 20px",
        marginBottom: 14,
        opacity: done ? 0.6 : 1,
        transition: "opacity 120ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          type="checkbox"
          checked={done}
          disabled={readOnly}
          onChange={(e) => toggleDone(e.target.checked)}
          aria-label={`Mark ${scenario.id} complete`}
          style={{ width: 20, height: 20, marginTop: 2, accentColor: theme.color.success, cursor: readOnly ? "default" : "pointer", flexShrink: 0 }}
        />
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 700, color: theme.color.purple, background: theme.color.purpleLight + "33", padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap" }}>
          {scenario.id}
        </span>
        <span style={{ fontWeight: 800, fontSize: 15.5, flex: 1, minWidth: 120 }}>{scenario.title}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 99, background: "#F7F6F3", color: theme.color.textMuted, border: `1px solid ${theme.color.border}`, whiteSpace: "nowrap" }}>
          {scenario.platform}
        </span>
      </div>
      <ol style={{ margin: "0 0 12px", paddingLeft: 20 }}>
        {scenario.steps.map((s, i) => (
          <li key={i} style={{ marginBottom: 6, fontSize: 14.5 }}>{s}</li>
        ))}
      </ol>
      <div style={{ display: "flex", gap: 8, fontSize: 14, padding: "10px 12px", background: theme.color.successBg, borderRadius: 8 }}>
        <strong style={{ color: theme.color.success, flexShrink: 0 }}>Expect:</strong>
        <span>{scenario.expect}</span>
      </div>
      {scenario.limitation && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: theme.color.warning, marginTop: 10 }}>
          ⚠ {scenario.limitation}
        </div>
      )}
      <div style={{ marginTop: 12, borderTop: `1px dashed ${theme.color.border}`, paddingTop: 10 }}>
        <input
          type="text"
          placeholder="Notes…"
          value={notesDraft}
          disabled={readOnly}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={saveNotes}
          style={{ width: "100%", border: "none", background: "transparent", borderBottom: `1px solid ${theme.color.border}`, padding: "4px 0", fontSize: 13.5, fontFamily: "inherit" }}
        />
        {done && progress?.doneByName && (
          <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 6 }}>Checked by {progress.doneByName}</div>
        )}
      </div>
    </div>
  );
}

function BugReportForm({ onFiled }: { onFiled: () => void }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [platform, setPlatform] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [severity, setSeverity] = useState<UatBugSeverity | null>(null);
  const [screenshotNote, setScreenshotNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user || !profile || !title.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.uatBugs), {
        round: CURRENT_UAT_ROUND,
        title: title.trim(),
        scenarioId: scenarioId.trim(),
        platform: platform.trim(),
        steps: steps.trim(),
        expected: expected.trim(),
        actual: actual.trim(),
        severity,
        screenshotNote: screenshotNote.trim(),
        filedByUid: user.uid,
        filedByName: profile.displayName,
        createdAt: Date.now(),
      });
      setTitle(""); setScenarioId(""); setPlatform(""); setSteps(""); setExpected(""); setActual(""); setSeverity(null); setScreenshotNote("");
      onFiled();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: "22px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Title"><input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" /></Field>
        <Field label="Scenario ID (if applicable)"><input style={inputStyle} value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} placeholder="e.g. FAN-07" /></Field>
        <Field label="Platform"><input style={inputStyle} value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Web / iOS / Android" /></Field>
        <Field label="Steps to reproduce"><textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={steps} onChange={(e) => setSteps(e.target.value)} /></Field>
        <Field label="Expected result"><input style={inputStyle} value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
        <Field label="Actual result"><input style={inputStyle} value={actual} onChange={(e) => setActual(e.target.value)} /></Field>
        <Field label="Severity">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SEVERITIES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeverity(severity === s.id ? null : s.id)}
                style={{
                  fontSize: 12.5, fontWeight: 700, padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${s.color}66`,
                  background: severity === s.id ? s.color : "transparent",
                  color: severity === s.id ? "#fff" : s.color,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Screenshot / screen recording note"><input style={inputStyle} value={screenshotNote} onChange={(e) => setScreenshotNote(e.target.value)} placeholder="Link, or describe where you saved it" /></Field>
        <PrimaryButton onClick={submit} disabled={submitting || !title.trim()}>{submitting ? "FILING…" : "FILE BUG"}</PrimaryButton>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: theme.color.textMuted, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function BugList({ bugs }: { bugs: (UatBugReport & { id: string })[] }) {
  if (bugs.length === 0) {
    return <p style={{ color: theme.color.textMuted, fontSize: 14 }}>No bugs filed yet.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {bugs.map((b) => {
        const sev = SEVERITIES.find((s) => s.id === b.severity);
        return (
          <Card key={b.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 15 }}>{b.title}</strong>
              {sev && <Pill bg={sev.color + "22"} fg={sev.color}>{sev.label}</Pill>}
              {b.scenarioId && <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: theme.color.textMuted }}>{b.scenarioId}</span>}
            </div>
            {b.steps && <p style={{ fontSize: 13.5, margin: "0 0 6px" }}><strong>Steps:</strong> {b.steps}</p>}
            {b.expected && <p style={{ fontSize: 13.5, margin: "0 0 6px" }}><strong>Expected:</strong> {b.expected}</p>}
            {b.actual && <p style={{ fontSize: 13.5, margin: "0 0 6px" }}><strong>Actual:</strong> {b.actual}</p>}
            <p style={{ fontSize: 12, color: theme.color.textMuted, margin: 0 }}>Filed by {b.filedByName} · {b.platform}</p>
          </Card>
        );
      })}
    </div>
  );
}

function SignoffForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user, profile } = useAuth();
  const [testerName, setTesterName] = useState(profile?.displayName ?? "");
  const [platformsTested, setPlatformsTested] = useState("");
  const [scenariosCompleted, setScenariosCompleted] = useState("");
  const [bugsFiled, setBugsFiled] = useState("");
  const [verdict, setVerdict] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user || !testerName.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.uatSignoffs), {
        round: CURRENT_UAT_ROUND,
        testerName: testerName.trim(),
        platformsTested: platformsTested.trim(),
        scenariosCompleted: scenariosCompleted.trim(),
        bugsFiled: bugsFiled.trim(),
        verdict: verdict.trim(),
        uid: user.uid,
        createdAt: Date.now(),
      });
      setPlatformsTested(""); setScenariosCompleted(""); setBugsFiled(""); setVerdict("");
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Tester name"><input style={inputStyle} value={testerName} onChange={(e) => setTesterName(e.target.value)} /></Field>
      <Field label="Platform(s) tested"><input style={inputStyle} value={platformsTested} onChange={(e) => setPlatformsTested(e.target.value)} placeholder="Web, iOS, Android…" /></Field>
      <Field label="Scenarios completed"><input style={inputStyle} value={scenariosCompleted} onChange={(e) => setScenariosCompleted(e.target.value)} placeholder="e.g. All Fan + Player scenarios" /></Field>
      <Field label="Bugs filed"><input style={inputStyle} value={bugsFiled} onChange={(e) => setBugsFiled(e.target.value)} placeholder="Count or summary" /></Field>
      <Field label="Overall verdict"><input style={inputStyle} value={verdict} onChange={(e) => setVerdict(e.target.value)} placeholder="Ready to ship? Blockers?" /></Field>
      <PrimaryButton onClick={submit} disabled={submitting || !testerName.trim()}>{submitting ? "SUBMITTING…" : "SUBMIT SIGN-OFF"}</PrimaryButton>
    </div>
  );
}

export function Uat() {
  const [viewRound, setViewRound] = useState(CURRENT_UAT_ROUND);
  const readOnly = viewRound !== CURRENT_UAT_ROUND;

  const { data: progressDocs } = useCollection<UatScenarioProgress>(COLLECTIONS.uatScenarios);
  const { data: bugs } = useCollection<UatBugReport>(COLLECTIONS.uatBugs, [orderBy("createdAt", "desc")]);
  const { data: signoffs } = useCollection<UatSignoff>(COLLECTIONS.uatSignoffs, [orderBy("createdAt", "desc")]);

  const progressById = useMemo(() => {
    const map: Record<string, UatScenarioProgress & { id: string }> = {};
    progressDocs.forEach((d) => {
      if ((d.round ?? 1) === viewRound) map[d.id] = d;
    });
    return map;
  }, [progressDocs, viewRound]);

  const roundBugs = useMemo(() => bugs.filter((b) => (b.round ?? 1) === viewRound), [bugs, viewRound]);
  const roundSignoffs = useMemo(() => signoffs.filter((s) => (s.round ?? 1) === viewRound), [signoffs, viewRound]);

  const doneCount = Object.values(progressById).filter((d) => d.done).length;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 20px 96px" }}>
      <header style={{ padding: "44px 0 28px", borderBottom: `1px solid ${theme.color.border}` }}>
        <p style={{ textTransform: "uppercase", letterSpacing: 2, fontSize: 12, fontWeight: 800, color: theme.color.purple, margin: "0 0 10px" }}>
          Umoja Games · Maryland SoccerPlex · Aug 14–16, 2026
        </p>
        <h1 style={{ fontFamily: theme.font.display, fontSize: 36, fontWeight: 900, margin: "0 0 8px" }}>User Acceptance Test Plan</h1>
        <p style={{ color: theme.color.textMuted, fontSize: 15, margin: "0 0 18px", maxWidth: "60ch" }}>
          Live, shared with every tester — checkmarks, notes, bugs, and sign-offs sync in real time for everyone signed in.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {UAT_ROUNDS.map((r) => (
            <button
              key={r.round}
              type="button"
              onClick={() => setViewRound(r.round)}
              style={{
                fontSize: 12.5, fontWeight: 800, padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${theme.color.purple}66`,
                background: viewRound === r.round ? theme.color.purple : "transparent",
                color: viewRound === r.round ? "#fff" : theme.color.purple,
              }}
            >
              {r.label}{r.status === "archived" ? " (read-only)" : ""}
            </button>
          ))}
        </div>

        {readOnly && (
          <div style={{ background: "#F7F6F3", border: `1px solid ${theme.color.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13.5, color: theme.color.textMuted }}>
            You're viewing an archived round, captured for reference. Checkmarks and notes here are frozen — switch to the current round to log new testing.
          </div>
        )}

        {!readOnly && (
          <div style={{ background: theme.color.purpleLight + "22", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
            <p style={{ fontWeight: 800, fontSize: 13.5, textTransform: "uppercase", color: theme.color.purple, margin: "0 0 8px" }}>What's new since Round 1</p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              {UAT_ROUND_2_CHANGES.map((c) => (
                <li key={c} style={{ marginBottom: 4 }}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <strong style={{ fontSize: 15 }}>{doneCount} / {UAT_SCENARIOS.length} scenarios checked</strong>
        </div>
      </header>

      <section style={{ margin: "32px 0" }}>
        <h2 style={{ fontFamily: theme.font.display, fontSize: 22, fontWeight: 900, margin: "0 0 12px" }}>Before You Start</h2>
        <div style={{ background: theme.color.warningBg, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ fontWeight: 800, fontSize: 13.5, textTransform: "uppercase", color: theme.color.warning, margin: "0 0 8px" }}>⚠ Two known gaps — don't file these as bugs</p>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14.5 }}>
            <li style={{ marginBottom: 6 }}><strong>Check-in ID verification</strong> uses a real AI vision model, but the production API key isn't wired up in this build yet — every check-in ends in an error at the final step. Please still test up through submission.</li>
            <li><strong>Captain complaint payments</strong>: Stripe checkout works end-to-end, but the webhook that syncs payment status back isn't fully wired up yet.</li>
          </ul>
        </div>
        <div style={{ background: theme.color.purpleLight + "22", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ fontWeight: 800, fontSize: 13.5, textTransform: "uppercase", color: theme.color.purple, margin: "0 0 8px" }}>Demo accounts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13.5 }}>
            {UAT_DEMO_ACCOUNTS.map((a) => (
              <div key={a.email}><strong>{a.role}:</strong> <span style={{ fontFamily: "ui-monospace, monospace" }}>{a.email}</span> / <span style={{ fontFamily: "ui-monospace, monospace" }}>{UAT_DEMO_PASSWORD}</span> — {a.notes}</div>
            ))}
          </div>
        </div>
      </section>

      {UAT_SECTIONS.map((section) => {
        const scenarios = UAT_SCENARIOS.filter((s) => s.section === section.id);
        return (
          <section key={section.id} style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: theme.font.display, fontSize: 22, fontWeight: 900, margin: "0 0 6px", display: "flex", gap: 10, alignItems: "baseline" }}>
              {section.title}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.textMuted, fontFamily: "ui-monospace, monospace" }}>
                {scenarios[0]?.id} – {scenarios[scenarios.length - 1]?.id}
              </span>
            </h2>
            <p style={{ color: theme.color.textMuted, fontSize: 14.5, margin: "0 0 20px", maxWidth: "65ch" }}>{section.desc}</p>
            {scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} progress={progressById[s.id]} round={viewRound} readOnly={readOnly} />
            ))}
          </section>
        );
      })}

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: theme.font.display, fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>Report a Bug</h2>
        <p style={{ color: theme.color.textMuted, fontSize: 14.5, margin: "0 0 20px" }}>Every bug filed here is visible to the whole team below.</p>
        {!readOnly && <BugReportForm onFiled={() => {}} />}
        <div style={{ marginTop: 20 }}>
          <BugList bugs={roundBugs} />
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: theme.font.display, fontSize: 22, fontWeight: 900, margin: "0 0 16px" }}>Tester Sign-off</h2>
        {!readOnly && <SignoffForm onSubmitted={() => {}} />}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {roundSignoffs.map((s) => (
            <Card key={s.id}>
              <strong style={{ fontSize: 15 }}>{s.testerName}</strong>
              <p style={{ fontSize: 13.5, margin: "6px 0 0" }}>{s.platformsTested} · {s.scenariosCompleted} · {s.bugsFiled} bugs filed</p>
              <p style={{ fontSize: 13.5, margin: "6px 0 0", color: theme.color.textMuted }}>{s.verdict}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
