import { useMemo, useState } from "react";
import { addDoc, collection, doc, deleteDoc, updateDoc, arrayUnion, where } from "firebase/firestore";
import {
  COLLECTIONS,
  HUNT_DECLINE_REASONS,
  HUNT_LAUNCH_LABEL,
  type HuntCrew,
  type HuntDeclineReason,
  type HuntMission,
  type HuntMissionType,
  type HuntSubmission,
} from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useHuntConfig, useHuntCrews, useHuntMissions, useHuntSubmissions } from "../../../hooks/useData";
import { useAuth } from "../../../auth/AuthProvider";
import { resetHunt, setHuntStarted } from "../../../lib/callables";
import { Card, Modal, Pill, PrimaryButton } from "../../../components/ui";
import { Lightbox } from "../../../components/Lightbox";
import { ChallengesAdminTab } from "./ChallengesAdminTab";

const TYPES: { id: HuntMissionType; label: string }[] = [
  { id: "photo", label: "📸 Photo" },
  { id: "video", label: "🎥 Video" },
  { id: "trivia", label: "🧠 Trivia" },
  { id: "gps", label: "📍 GPS" },
  { id: "qr", label: "🔲 QR" },
  { id: "text", label: "💬 Text" },
  { id: "mini_game", label: "🎮 Mini-game" },
];

const DAYS: { id: "1" | "2" | "3" | "open"; label: string }[] = [
  { id: "1", label: "Day 1" },
  { id: "2", label: "Day 2" },
  { id: "3", label: "Day 3" },
  { id: "open", label: "Open (all days)" },
];

export function HuntAdminTab() {
  const { user } = useAuth();
  const { data: huntConfig } = useHuntConfig();
  const { data: missions } = useHuntMissions();
  const { data: crews } = useHuntCrews();
  const { data: pendingSubmissions } = useHuntSubmissions([where("status", "==", "pending")]);
  // Every submission, any status — grouped per mission below so the library
  // can show "3 pending" at a glance and the detail modal can show a
  // mission's full submission history, not just what's still pending.
  const { data: allSubmissions } = useHuntSubmissions();
  const [type, setType] = useState<HuntMissionType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState<"1" | "2" | "3" | "open">("open");
  const [points, setPoints] = useState(75);
  const [busy, setBusy] = useState(false);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [section, setSection] = useState<"missions" | "challenges" | "leaderboard">("missions");
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  // Set while a Reject is awaiting a reason from the picker below — separate
  // from openMissionId so rejecting from either the top pending list or the
  // per-mission modal both funnel through the same one confirm step.
  const [decliningSubmission, setDecliningSubmission] = useState<HuntSubmission | null>(null);

  const submissionsByMission = useMemo(() => {
    const map = new Map<string, HuntSubmission[]>();
    for (const s of allSubmissions) {
      const list = map.get(s.missionId) ?? [];
      list.push(s);
      map.set(s.missionId, list);
    }
    return map;
  }, [allSubmissions]);
  const openMission = openMissionId ? missions.find((m) => m.id === openMissionId) ?? null : null;
  // crews is already ordered by points desc (useHuntCrews) — rank is just its index.
  const crewRankById = useMemo(() => new Map(crews.map((c, i) => [c.id, i + 1])), [crews]);

  async function toggleHuntStarted(started: boolean) {
    const confirmMsg = started
      ? "Launch The Hunt now? It becomes visible to everyone immediately."
      : "Pause The Hunt? It goes back to the \"coming soon\" page for everyone until you launch it again.";
    if (!window.confirm(confirmMsg)) return;
    setLaunchBusy(true);
    try {
      await setHuntStarted({ started });
    } finally {
      setLaunchBusy(false);
    }
  }

  async function resetHuntData() {
    if (
      !window.confirm(
        "Reset The Hunt? This permanently deletes every mission submission and sets every crew's points/missions completed back to zero. Crews themselves stay — this can't be undone."
      )
    ) {
      return;
    }
    setResetBusy(true);
    try {
      await resetHunt();
    } finally {
      setResetBusy(false);
    }
  }

  async function reviewSubmission(submission: HuntSubmission, approve: boolean, rejectionReason?: string) {
    if (!user) return;
    const { id: submissionId, crewId, missionId } = submission;
    await updateDoc(doc(db, COLLECTIONS.huntSubmissions, submissionId), {
      status: approve ? "approved" : "rejected",
      reviewedBy: user.uid,
      reviewedAt: Date.now(),
      ...(approve ? {} : { rejectionReason: rejectionReason || "Not approved" }),
    });
    if (approve) {
      const mission = missions.find((m) => m.id === missionId);
      const crew = crews.find((c) => c.id === crewId);
      if (mission && crew && !crew.missionsCompleted.includes(missionId)) {
        await updateDoc(doc(db, COLLECTIONS.huntCrews, crewId), {
          points: crew.points + mission.points,
          missionsCompleted: arrayUnion(missionId),
        });
      }
      // Mirror an approved photo/video submission onto the Moments wall so the
      // whole community can see it — matches the original design intent.
      if (submission.mediaUrl && (submission.mediaType === "photo" || submission.mediaType === "video")) {
        await addDoc(collection(db, COLLECTIONS.moments), {
          mediaType: submission.mediaType,
          mediaUrl: submission.mediaUrl,
          caption: mission?.title ?? "Hunt mission",
          postedBy: submission.submittedBy,
          postedByName: submission.submittedByName,
          source: "hunt",
          huntSubmissionId: submissionId,
          likeUids: [],
          moderationStatus: "approved",
          createdAt: Date.now(),
        });
      }
    }
  }

  async function addMission() {
    if (!type || !title.trim()) return;
    setBusy(true);
    try {
      await addDoc(collection(db, COLLECTIONS.huntMissions), {
        type, title, subtitle: day === "open" ? "Open mission" : `Day ${day}`, description, points, day,
      });
      setTitle("");
      setDescription("");
      setType(null);
      setPoints(75);
    } finally {
      setBusy(false);
    }
  }

  async function removeMission(id: string) {
    await deleteDoc(doc(db, COLLECTIONS.huntMissions, id));
  }

  return (
    <div>
      <Card style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            {huntConfig?.started ? "🟢 The Hunt is LIVE" : "🔒 The Hunt is not started yet"}
          </div>
          <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
            {huntConfig?.started
              ? `Started ${huntConfig.startedAt ? new Date(huntConfig.startedAt).toLocaleString() : ""}${huntConfig.startedByName ? ` by ${huntConfig.startedByName}` : ""}.`
              : `Everyone sees a "coming soon" page (opens ${HUNT_LAUNCH_LABEL}) until you launch it here.`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            disabled={resetBusy}
            onClick={resetHuntData}
            title="Delete every submission and zero out every crew's points/missions — for clearing test data or a full restart."
            style={{ background: "none", border: `1px solid ${theme.color.danger}`, borderRadius: theme.radius.sm, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: theme.color.danger }}
          >
            {resetBusy ? "Resetting…" : "🗑 Reset Hunt"}
          </button>
          {huntConfig?.started ? (
            <button
              disabled={launchBusy}
              onClick={() => toggleHuntStarted(false)}
              style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: theme.color.textMuted }}
            >
              {launchBusy ? "…" : "Pause The Hunt"}
            </button>
          ) : (
            <PrimaryButton disabled={launchBusy} onClick={() => toggleHuntStarted(true)}>
              {launchBusy ? "Launching…" : "🚀 LAUNCH THE HUNT"}
            </PrimaryButton>
          )}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Pill active={section === "missions"} onClick={() => setSection("missions")}>Missions</Pill>
        <Pill active={section === "challenges"} onClick={() => setSection("challenges")}>Challenges</Pill>
        <Pill active={section === "leaderboard"} onClick={() => setSection("leaderboard")}>🏆 Leaderboard</Pill>
      </div>

      {section === "challenges" ? <ChallengesAdminTab /> : section === "leaderboard" ? (
        <HuntLeaderboard crews={crews} totalMissions={missions.length} />
      ) : (
      <>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>SUBMISSIONS TO REVIEW ({pendingSubmissions.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {pendingSubmissions.map((s) => {
          const mission = missions.find((m) => m.id === s.missionId);
          const crew = crews.find((c) => c.id === s.crewId);
          const rank = crew ? crewRankById.get(crew.id) : undefined;
          return (
            <Card key={s.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {s.mediaUrl && (
                <div
                  onClick={() => setLightbox({ src: s.mediaUrl!, mediaType: s.mediaType === "video" ? "video" : "photo" })}
                  style={{ width: 60, height: 44, borderRadius: 6, background: `url(${s.mediaUrl}) center/cover`, cursor: "zoom-in", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{mission?.title ?? s.missionId}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {crew ? (
                    <>
                      <strong>{crew.name}</strong> · {crew.members.length} member{crew.members.length === 1 ? "" : "s"} · rank #{rank ?? "—"} · {crew.points} pts so far
                    </>
                  ) : (
                    s.crewId
                  )}
                </div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 1 }}>
                  Submitted by {s.submittedByName} {s.textAnswer && `· "${s.textAnswer}"`}
                </div>
              </div>
              {mission && (
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: theme.color.pink, flexShrink: 0 }}>+{mission.points}</div>
              )}
              <button onClick={() => reviewSubmission(s, true)} style={{ background: theme.color.successBg, color: theme.color.success, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Approve</button>
              <button onClick={() => setDecliningSubmission(s)} style={{ background: theme.color.dangerBg, color: theme.color.danger, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reject</button>
            </Card>
          );
        })}
        {pendingSubmissions.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Nothing waiting for review.</div>}
      </div>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>ADD A MISSION</div>
      <Card style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {TYPES.map((t) => <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.label}</Pill>)}
        </div>
        <input
          placeholder="Mission title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5 }}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5, resize: "none" }}
        />
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {DAYS.map((d) => <Pill key={d.id} active={day === d.id} onClick={() => setDay(d.id)}>{d.label}</Pill>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Points</span>
          <button onClick={() => setPoints((p) => Math.max(25, p - 25))} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "#fff" }}>−</button>
          <span style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16 }}>{points}</span>
          <button onClick={() => setPoints((p) => p + 25)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "#fff" }}>+</button>
        </div>
        <PrimaryButton disabled={!type || !title.trim() || busy} onClick={addMission}>{busy ? "Adding…" : "ADD MISSION"}</PrimaryButton>
      </Card>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MISSION LIBRARY ({missions.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {missions.map((m) => {
          const subs = submissionsByMission.get(m.id) ?? [];
          const pendingCount = subs.filter((s) => s.status === "pending").length;
          return (
            <Card
              key={m.id}
              onClick={() => setOpenMissionId(m.id)}
              style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, cursor: "pointer" }}
            >
              <div style={{ minWidth: 120 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{TYPES.find((t) => t.id === m.type)?.label} {m.title}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted }}>{m.subtitle} · {m.points} pts</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
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
                <button
                  onClick={(e) => { e.stopPropagation(); removeMission(m.id); }}
                  style={{ background: "none", border: "none", color: theme.color.danger, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      </>
      )}
      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
      {openMission && (
        <MissionSubmissionsModal
          mission={openMission}
          submissions={submissionsByMission.get(openMission.id) ?? []}
          crews={crews}
          crewRankById={crewRankById}
          onApprove={(s) => reviewSubmission(s, true)}
          onReject={(s) => setDecliningSubmission(s)}
          onViewMedia={(src, mediaType) => setLightbox({ src, mediaType })}
          onClose={() => setOpenMissionId(null)}
        />
      )}
      {decliningSubmission && (
        <DeclineReasonModal
          onConfirm={(reason) => {
            reviewSubmission(decliningSubmission, false, reason);
            setDecliningSubmission(null);
          }}
          onClose={() => setDecliningSubmission(null)}
        />
      )}
    </div>
  );
}

function MissionSubmissionsModal({
  mission, submissions, crews, crewRankById, onApprove, onReject, onViewMedia, onClose,
}: {
  mission: HuntMission;
  submissions: HuntSubmission[];
  crews: ReturnType<typeof useHuntCrews>["data"];
  crewRankById: Map<string, number>;
  onApprove: (s: HuntSubmission) => void;
  onReject: (s: HuntSubmission) => void;
  onViewMedia: (src: string, mediaType: "photo" | "video") => void;
  onClose: () => void;
}) {
  const sorted = [...submissions].sort((a, b) => {
    // Pending first (needs attention), then most recent.
    if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
  const STATUS_STYLE: Record<HuntSubmission["status"], { bg: string; fg: string; label: string }> = {
    pending: { bg: theme.color.warningBg, fg: theme.color.warning, label: "Pending" },
    approved: { bg: theme.color.successBg, fg: theme.color.success, label: "Approved" },
    rejected: { bg: theme.color.dangerBg, fg: theme.color.danger, label: "Rejected" },
  };
  const typeLabel = TYPES.find((t) => t.id === mission.type)?.label ?? mission.type;

  return (
    <Modal onClose={onClose} width={620}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.purple, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
        {typeLabel}
      </div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 21, marginBottom: 6 }}>{mission.title}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 4 }}>{mission.subtitle} · {mission.points} pts</div>
      {mission.description && (
        <div style={{ fontSize: 13.5, lineHeight: 1.5, background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12, marginBottom: 18 }}>
          {mission.description}
        </div>
      )}

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
        SUBMISSIONS ({submissions.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((s) => {
          const crew = crews.find((c) => c.id === s.crewId);
          const rank = crew ? crewRankById.get(crew.id) : undefined;
          const alreadyHasThisMission = crew?.missionsCompleted.includes(mission.id) ?? false;
          const st = STATUS_STYLE[s.status];
          return (
            <Card key={s.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {s.mediaUrl && (
                <div
                  onClick={() => onViewMedia(s.mediaUrl!, s.mediaType === "video" ? "video" : "photo")}
                  style={{ width: 56, height: 42, borderRadius: 6, background: `url(${s.mediaUrl}) center/cover`, cursor: "zoom-in", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{crew?.name ?? s.crewId}</div>
                {crew && (
                  <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 1 }}>
                    {crew.members.length} member{crew.members.length === 1 ? "" : "s"} · rank #{rank ?? "—"} · {crew.points} pts so far
                    {s.status === "pending" && alreadyHasThisMission && (
                      <span style={{ color: theme.color.warning, fontWeight: 700 }}> · already completed this mission</span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                  {s.submittedByName} {s.textAnswer && `· "${s.textAnswer}"`}
                </div>
                {s.status === "rejected" && s.rejectionReason && (
                  <div style={{ fontSize: 11.5, color: theme.color.danger, marginTop: 2 }}>Declined: {s.rejectionReason}</div>
                )}
                {s.status !== "pending" && s.reviewedAt && (
                  <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>Decided {new Date(s.reviewedAt).toLocaleString()}</div>
                )}
              </div>
              <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: s.status === "rejected" ? theme.color.textMuted : theme.color.pink, flexShrink: 0 }}>
                +{mission.points}
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
        {submissions.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>No submissions for this mission yet.</div>}
      </div>
    </Modal>
  );
}

/** Reject requires picking a reason from the shared pool (or writing one in via "Other") — the crew sees it, so declines stay actionable instead of a bare "not approved." */
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

/** Ranked crew list — rank, points, missions completed, member count. Sorted server-side already (useHuntCrews orders by points desc), so this is always live/current as crews score. */
function HuntLeaderboard({ crews, totalMissions }: { crews: HuntCrew[]; totalMissions: number }) {
  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>LEADERBOARD ({crews.length} crews)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {crews.map((c, i) => (
          <Card key={c.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: theme.font.display, fontWeight: 800, width: 30, fontSize: i < 3 ? 19 : 14, flexShrink: 0 }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                {c.members.map((m) => m.name).join(", ")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: theme.color.textMuted }}>
                {c.missionsCompleted.length}/{totalMissions} missions{(c.challengesCompleted?.length ?? 0) > 0 ? ` · ${c.challengesCompleted!.length} challenges` : ""}
              </div>
            </div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, minWidth: 70, textAlign: "right" }}>{c.points} pts</div>
          </Card>
        ))}
        {crews.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No crews have joined yet.</div>}
      </div>
    </div>
  );
}
