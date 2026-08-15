import { useMemo, useState } from "react";
import { addDoc, collection, where } from "firebase/firestore";
import {
  COLLECTIONS,
  HUNT_DECLINE_REASONS,
  type Challenge,
  type ChallengeAnswerType,
  type ChallengeSubmission,
  type HuntDeclineReason,
} from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useChallenges, useChallengeSubmissions, useHuntCrews } from "../../../hooks/useData";
import { reviewChallengeSubmission } from "../../../lib/callables";
import { Card, Modal, Pill, PrimaryButton } from "../../../components/ui";
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
  // Every submission, any status — same as HuntAdminTab's missions side:
  // powers the per-challenge pending-count badge and the detail modal's full
  // submission history, not just what's still pending.
  const { data: allSubmissions } = useChallengeSubmissions();

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
  const [openChallengeId, setOpenChallengeId] = useState<string | null>(null);
  const [decliningSubmission, setDecliningSubmission] = useState<ChallengeSubmission | null>(null);

  const submissionsByChallenge = useMemo(() => {
    const map = new Map<string, ChallengeSubmission[]>();
    for (const s of allSubmissions) {
      const list = map.get(s.challengeId) ?? [];
      list.push(s);
      map.set(s.challengeId, list);
    }
    return map;
  }, [allSubmissions]);
  const openChallenge = openChallengeId ? challenges.find((c) => c.id === openChallengeId) ?? null : null;
  // crews is already ordered by points desc (useHuntCrews) — rank is just its index.
  const crewRankById = useMemo(() => new Map(crews.map((c, i) => [c.id, i + 1])), [crews]);

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

  async function review(submissionId: string, decision: "approve" | "reject", rejectionReason?: string) {
    setReviewing(submissionId);
    try {
      await reviewChallengeSubmission({ submissionId, decision, rejectionReason });
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
          const rank = crew ? crewRankById.get(crew.id) : undefined;
          return (
            <Card key={s.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div
                onClick={() => setLightbox({ src: s.mediaUrl, mediaType: s.mediaType })}
                style={{ width: 60, height: 44, borderRadius: 6, background: `url(${s.mediaUrl}) center/cover`, flexShrink: 0, cursor: "zoom-in" }}
              />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{challenge?.title ?? s.challengeId}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {crew ? (
                    <>
                      <strong>{crew.name}</strong> · {crew.members.length} member{crew.members.length === 1 ? "" : "s"} · rank #{rank ?? "—"} · {crew.points} pts so far
                    </>
                  ) : (
                    s.crewId
                  )}
                </div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 1 }}>Submitted by {s.submittedByName}</div>
              </div>
              {challenge && (
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: theme.color.orange, flexShrink: 0 }}>+{challenge.points}</div>
              )}
              <button
                disabled={reviewing === s.id}
                onClick={() => review(s.id, "approve")}
                style={{ background: theme.color.successBg, color: theme.color.success, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Approve
              </button>
              <button
                disabled={reviewing === s.id}
                onClick={() => setDecliningSubmission(s)}
                style={{ background: theme.color.dangerBg, color: theme.color.danger, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
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
        {challenges.map((c) => {
          const subs = submissionsByChallenge.get(c.id) ?? [];
          const pendingCount = subs.filter((s) => s.status === "pending").length;
          return (
            <Card
              key={c.id}
              onClick={() => setOpenChallengeId(c.id)}
              style={{ padding: "10px 14px", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, minWidth: 120 }}>{c.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {subs.length > 0 && (
                    <span
                      style={{
                        fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "4px 10px",
                        background: pendingCount > 0 ? theme.color.warningBg : "#F1EFF5",
                        color: pendingCount > 0 ? theme.color.warning : theme.color.textMuted,
                      }}
                    >
                      {pendingCount > 0 ? `${pendingCount} pending · ${subs.length} total` : `${subs.length} submitted`}
                    </span>
                  )}
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.color.purple }}>+{c.points} pts</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                {ANSWER_TYPES.find((a) => a.id === c.answerType)?.label}
                {c.startsAt && ` · starts ${new Date(c.startsAt).toLocaleString()}`}
                {c.deadline && ` · deadline ${new Date(c.deadline).toLocaleString()}`}
                {c.earlyBirdBonuses.length > 0 && ` · early-bird: ${c.earlyBirdBonuses.join("/")}`}
              </div>
            </Card>
          );
        })}
        {challenges.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No challenges published yet.</div>}
      </div>
      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
      {openChallenge && (
        <ChallengeSubmissionsModal
          challenge={openChallenge}
          submissions={submissionsByChallenge.get(openChallenge.id) ?? []}
          crews={crews}
          crewRankById={crewRankById}
          onApprove={(s) => review(s.id, "approve")}
          onReject={(s) => setDecliningSubmission(s)}
          onViewMedia={(src, mediaType) => setLightbox({ src, mediaType })}
          onClose={() => setOpenChallengeId(null)}
        />
      )}
      {decliningSubmission && (
        <DeclineReasonModal
          onConfirm={(reason) => {
            review(decliningSubmission.id, "reject", reason);
            setDecliningSubmission(null);
          }}
          onClose={() => setDecliningSubmission(null)}
        />
      )}
    </div>
  );
}

/** One challenge's full picture — description, early-bird schedule, and every submission with crew context, points, and (once decided) rank/bonus or decline reason. Approve/reject stays available inline. */
function ChallengeSubmissionsModal({
  challenge, submissions, crews, crewRankById, onApprove, onReject, onViewMedia, onClose,
}: {
  challenge: Challenge;
  submissions: ChallengeSubmission[];
  crews: ReturnType<typeof useHuntCrews>["data"];
  crewRankById: Map<string, number>;
  onApprove: (s: ChallengeSubmission) => void;
  onReject: (s: ChallengeSubmission) => void;
  onViewMedia: (src: string, mediaType: "photo" | "video") => void;
  onClose: () => void;
}) {
  const STATUS_STYLE: Record<ChallengeSubmission["status"], { bg: string; fg: string; label: string }> = {
    pending: { bg: theme.color.warningBg, fg: theme.color.warning, label: "Pending" },
    approved: { bg: theme.color.successBg, fg: theme.color.success, label: "Approved" },
    rejected: { bg: theme.color.dangerBg, fg: theme.color.danger, label: "Rejected" },
  };
  const sorted = [...submissions].sort((a, b) => {
    if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
    return a.createdAt - b.createdAt; // earliest first — matches early-bird rank order
  });
  const ordinal = (i: number) => (i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`);

  return (
    <Modal onClose={onClose} width={620}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.orange, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
        ⚡ Challenge
      </div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 21, marginBottom: 6 }}>{challenge.title}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 4 }}>
        +{challenge.points} pts
        {challenge.startsAt && ` · starts ${new Date(challenge.startsAt).toLocaleString()}`}
        {challenge.deadline && ` · deadline ${new Date(challenge.deadline).toLocaleString()}`}
      </div>
      {challenge.description && (
        <div style={{ fontSize: 13.5, lineHeight: 1.5, background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12, marginBottom: 12 }}>
          {challenge.description}
        </div>
      )}
      {challenge.earlyBirdBonuses.length > 0 && (
        <div style={{ background: "#FFF6DD", borderRadius: theme.radius.sm, padding: 12, fontSize: 12.5, marginBottom: 18 }}>
          🏅 Early-bird bonus, ranked by submission time: {challenge.earlyBirdBonuses.map((b, i) => `${ordinal(i)} +${b}`).join(" · ")}
        </div>
      )}

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
        SUBMISSIONS ({submissions.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((s, i) => {
          const crew = crews.find((c) => c.id === s.crewId);
          const rank = crew ? crewRankById.get(crew.id) : undefined;
          const st = STATUS_STYLE[s.status];
          // Rank/bonus shown once approved carries the REAL server-computed
          // values (submissionRank/bonusPoints); this row's own position (i)
          // among non-pending submissions is only a preview for pending ones.
          const earlyBirdSlot = s.status === "approved" ? s.submissionRank : i;
          const previewBonus =
            s.status === "approved"
              ? s.bonusPoints ?? 0
              : earlyBirdSlot !== undefined && earlyBirdSlot < challenge.earlyBirdBonuses.length
              ? challenge.earlyBirdBonuses[earlyBirdSlot]
              : 0;
          return (
            <Card key={s.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div
                onClick={() => onViewMedia(s.mediaUrl, s.mediaType)}
                style={{ width: 56, height: 42, borderRadius: 6, background: `url(${s.mediaUrl}) center/cover`, cursor: "zoom-in", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{crew?.name ?? s.crewId}</div>
                {crew && (
                  <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 1 }}>
                    {crew.members.length} member{crew.members.length === 1 ? "" : "s"} · rank #{rank ?? "—"} · {crew.points} pts so far
                  </div>
                )}
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{s.submittedByName}</div>
                {s.status === "rejected" && s.rejectionReason && (
                  <div style={{ fontSize: 11.5, color: theme.color.danger, marginTop: 2 }}>Declined: {s.rejectionReason}</div>
                )}
                {s.status !== "pending" && s.reviewedAt && (
                  <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>Decided {new Date(s.reviewedAt).toLocaleString()}</div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: s.status === "rejected" ? theme.color.textMuted : theme.color.orange }}>
                  +{challenge.points}{previewBonus > 0 ? ` +${previewBonus}` : ""}
                </div>
                {previewBonus > 0 && (
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.color.warning }}>
                    {ordinal(earlyBirdSlot ?? 0)} submitted{s.status !== "approved" ? " (if approved)" : ""}
                  </div>
                )}
              </div>
              {s.status === "pending" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onApprove(s)} style={{ background: theme.color.successBg, color: theme.color.success, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                  <button onClick={() => onReject(s)} style={{ background: theme.color.dangerBg, color: theme.color.danger, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                </div>
              ) : (
                <span style={{ background: st.bg, color: st.fg, borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
                  {st.label}
                </span>
              )}
            </Card>
          );
        })}
        {submissions.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No submissions for this challenge yet.</div>}
      </div>
    </Modal>
  );
}

/** Reject requires picking a reason from the shared pool (or writing one in via "Other") — same pattern and pool as Hunt mission declines (HuntAdminTab.tsx). */
function DeclineReasonModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState<HuntDeclineReason>(HUNT_DECLINE_REASONS[0]);
  const [other, setOther] = useState("");
  const finalReason = reason === "Other" ? other.trim() : reason;

  return (
    <Modal onClose={onClose} width={420}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Decline submission</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 14 }}>The crew will see this reason so they know what to fix.</div>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as HuntDeclineReason)}
        style={{ width: "100%", padding: "9px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13, marginBottom: 10 }}
      >
        {HUNT_DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      {reason === "Other" && (
        <input
          autoFocus
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Describe the reason…"
          style={{ width: "100%", padding: "9px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13, marginBottom: 10 }}
        />
      )}
      <PrimaryButton disabled={!finalReason} onClick={() => onConfirm(finalReason)} style={{ width: "100%" }}>
        Confirm decline
      </PrimaryButton>
    </Modal>
  );
}
