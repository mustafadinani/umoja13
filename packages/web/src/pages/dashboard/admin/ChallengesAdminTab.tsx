import { useState } from "react";
import { addDoc, collection, where } from "firebase/firestore";
import { COLLECTIONS, type ChallengeAnswerType } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useChallenges, useChallengeSubmissions, useHuntCrews } from "../../../hooks/useData";
import { reviewChallengeSubmission } from "../../../lib/callables";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { Lightbox } from "../../../components/Lightbox";

const ANSWER_TYPES: { id: ChallengeAnswerType; label: string }[] = [
  { id: "photo_or_video", label: "Photo or video" },
  { id: "photo_only", label: "Photo only" },
  { id: "video_only", label: "Video only" },
];

export function ChallengesAdminTab() {
  const { user } = useAuth();
  const { data: challenges } = useChallenges();
  const { data: crews } = useHuntCrews();
  const { data: pendingSubmissions } = useChallengeSubmissions([where("status", "==", "pending")]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(25);
  const [starts, setStarts] = useState("");
  const [deadline, setDeadline] = useState("");
  const [answerType, setAnswerType] = useState<ChallengeAnswerType>("photo_or_video");
  const [bonuses, setBonuses] = useState<number[]>([0, 0, 0]);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);

  function updateBonus(i: number, value: number) {
    setBonuses((list) => list.map((b, idx) => (idx === i ? value : b)));
  }

  async function publish() {
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      await addDoc(collection(db, COLLECTIONS.challenges), {
        title,
        description,
        points,
        answerType,
        ...(starts ? { startsAt: new Date(starts).getTime() } : {}),
        ...(deadline ? { deadline: new Date(deadline).getTime() } : {}),
        earlyBirdBonuses: bonuses.filter((b) => b > 0),
        createdAt: Date.now(),
        createdBy: user.uid,
      });
      setTitle("");
      setDescription("");
      setPoints(25);
      setStarts("");
      setDeadline("");
      setAnswerType("photo_or_video");
      setBonuses([0, 0, 0]);
    } finally {
      setBusy(false);
    }
  }

  async function review(submissionId: string, decision: "approve" | "reject") {
    setReviewing(submissionId);
    try {
      await reviewChallengeSubmission({ submissionId, decision });
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
        SUBMISSIONS TO REVIEW ({pendingSubmissions.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {pendingSubmissions.map((s) => {
          const challenge = challenges.find((c) => c.id === s.challengeId);
          const crew = crews.find((c) => c.id === s.crewId);
          return (
            <Card key={s.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div
                onClick={() => setLightbox({ src: s.mediaUrl, mediaType: s.mediaType })}
                style={{ width: 60, height: 44, borderRadius: 6, background: `url(${s.mediaUrl}) center/cover`, flexShrink: 0, cursor: "zoom-in" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{challenge?.title ?? s.challengeId}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted }}>{crew?.name ?? s.crewId} · {s.submittedByName}</div>
              </div>
              <button
                disabled={reviewing === s.id}
                onClick={() => review(s.id, "approve")}
                style={{ background: theme.color.successBg, color: theme.color.success, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}
              >
                Approve
              </button>
              <button
                disabled={reviewing === s.id}
                onClick={() => review(s.id, "reject")}
                style={{ background: theme.color.dangerBg, color: theme.color.danger, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}
              >
                Reject
              </button>
            </Card>
          );
        })}
        {pendingSubmissions.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Nothing waiting for review.</div>}
      </div>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>NEW CHALLENGE</div>
      <Card style={{ marginBottom: 28 }}>
        <input
          placeholder="Title — e.g. Match-day fit check"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5 }}
        />
        <textarea
          placeholder="What should they upload? Keep it clear."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 14, fontSize: 13.5, resize: "none" }}
        />

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Points</div>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value) || 0)}
              style={{ width: 90, padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Starts (optional)</div>
            <input
              type="datetime-local"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              style={{ padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Deadline (optional)</div>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>Answer type</div>
            <div style={{ display: "flex", gap: 6 }}>
              {ANSWER_TYPES.map((a) => (
                <Pill key={a.id} active={answerType === a.id} onClick={() => setAnswerType(a.id)}>{a.label}</Pill>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${theme.color.border}`, paddingTop: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Early-bird bonuses (optional)</div>
          <div style={{ color: theme.color.textMuted, fontSize: 12, marginBottom: 10 }}>
            Extra points for whoever <em>submitted</em> earliest — ranked by submission time, not when you approve.
            (An entry still has to be approved to collect it.) Leave blank for none.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            {bonuses.map((b, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                  {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`} submitted
                </div>
                <input
                  type="number"
                  value={b}
                  onChange={(e) => updateBonus(i, Number(e.target.value) || 0)}
                  style={{ width: 80, padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                />
              </div>
            ))}
            <button
              onClick={() => setBonuses((list) => [...list, 0])}
              style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: 999, padding: "9px 14px", fontWeight: 700, fontSize: 12.5 }}
            >
              + Add place
            </button>
            {bonuses.length > 0 && (
              <button
                onClick={() => setBonuses((list) => list.slice(0, -1))}
                style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: 999, padding: "9px 14px", fontWeight: 700, fontSize: 12.5 }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <PrimaryButton disabled={!title.trim() || busy} onClick={publish}>
          {busy ? "Publishing…" : "+ Publish challenge"}
        </PrimaryButton>
      </Card>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
        CHALLENGES ({challenges.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {challenges.map((c) => (
          <Card key={c.id} style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.purple }}>+{c.points} pts</div>
            </div>
            <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
              {ANSWER_TYPES.find((a) => a.id === c.answerType)?.label}
              {c.startsAt && ` · starts ${new Date(c.startsAt).toLocaleString()}`}
              {c.deadline && ` · deadline ${new Date(c.deadline).toLocaleString()}`}
              {c.earlyBirdBonuses.length > 0 && ` · early-bird: ${c.earlyBirdBonuses.join("/")}`}
            </div>
          </Card>
        ))}
        {challenges.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No challenges published yet.</div>}
      </div>
      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
    </div>
  );
}
