import { useState } from "react";
import type { HuntMissionType, HuntMission, Challenge } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme, hunterGradient } from "../lib/theme";
import { useChallenges, useHuntCrews, useHuntMissions, useMyChallengeSubmissions, useMyCrew } from "../hooks/useData";
import { Card, Pill } from "../components/ui";
import { CrewCreateWizard } from "./hunt/CrewCreateWizard";
import { InvitesBanner } from "./hunt/InvitesBanner";
import { MissionDetailModal } from "./hunt/MissionDetailModal";
import { ChallengeDetailModal } from "./hunt/ChallengeDetailModal";
import { CrewDetailModal } from "./hunt/CrewDetailModal";

const TYPE_LABELS: Record<HuntMissionType, string> = {
  photo: "📸 Photo",
  video: "🎥 Video",
  trivia: "🧠 Trivia",
  gps: "📍 GPS",
  qr: "🔲 QR",
  text: "💬 Text",
  mini_game: "🎮 Mini-game",
};
const TYPE_ICON_BG: Record<HuntMissionType, string> = {
  photo: theme.color.purple,
  video: theme.color.pink,
  trivia: theme.color.blue,
  gps: theme.color.teal,
  qr: theme.color.orange,
  text: theme.color.purpleLight,
  mini_game: theme.color.gold,
};

const DAY_LABELS: Record<string, string> = { "1": "Day 1", "2": "Day 2", "3": "Day 3", open: "Open (all days)" };

function activeChallenge(c: Challenge, now: number) {
  if (c.startsAt && now < c.startsAt) return false;
  if (c.deadline && now > c.deadline) return false;
  return true;
}

export function Hunt() {
  const { user } = useAuth();
  const { data: missions } = useHuntMissions();
  const { data: challenges } = useChallenges();
  const { data: crew } = useMyCrew(user?.uid);
  const { data: myChallengeSubmissions } = useMyChallengeSubmissions(crew?.id);
  const { data: leaderboard } = useHuntCrews();
  const [seg, setSeg] = useState<"missions" | "challenges" | "leaderboard">("missions");
  const [typeFilter, setTypeFilter] = useState<HuntMissionType | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [openMission, setOpenMission] = useState<HuntMission | null>(null);
  const [openChallenge, setOpenChallenge] = useState<Challenge | null>(null);
  const [openCrewId, setOpenCrewId] = useState<string | null>(null);

  const filteredMissions = missions.filter((m) => (!typeFilter || m.type === typeFilter) && (!dayFilter || m.day === dayFilter));
  const openCrew = leaderboard.find((c) => c.id === openCrewId) ?? null;
  const now = Date.now();
  const activeChallenges = challenges.filter((c) => activeChallenge(c, now));
  const myRank = crew ? leaderboard.findIndex((c) => c.id === crew.id) + 1 : 0;
  const totalDone = crew ? crew.missionsCompleted.length + (crew.challengesCompleted?.length ?? 0) : 0;
  const totalAvailable = missions.length + challenges.length;
  const progressPct = totalAvailable > 0 ? Math.round((totalDone / totalAvailable) * 100) : 0;

  return (
    <div>
      <div style={{ background: hunterGradient, color: "#fff", padding: "36px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 36 }}>🧭 THE HUNT</div>
          <div style={{ fontSize: 14, opacity: 0.92, marginTop: 6 }}>
            45 missions across 3 days, plus surprise challenges. $500 grand prize at Sunday's ceremony.
          </div>

          {crew && (
            <div style={{ background: "rgba(255,255,255,.16)", borderRadius: theme.radius.lg, padding: "16px 18px", marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>{crew.name}</div>
                  {myRank > 0 && <div style={{ fontSize: 12.5, opacity: 0.85 }}>Rank #{myRank} of {leaderboard.length}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 30 }}>{crew.points}</div>
                  <div style={{ fontSize: 11.5, opacity: 0.85, letterSpacing: 0.5 }}>POINTS</div>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progressPct}%`, background: theme.color.gold, borderRadius: 99, transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
                {totalDone} of {totalAvailable} done ({progressPct}%)
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16 }}>
            {(Object.keys(TYPE_LABELS) as HuntMissionType[]).map((t) => (
              <Pill key={t} active={typeFilter === t} onClick={() => setTypeFilter(typeFilter === t ? null : t)} bg="rgba(255,255,255,.18)" fg="#fff">
                {TYPE_LABELS[t]}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px 48px" }}>
        {!user ? (
          <Card>
            <div style={{ fontWeight: 700 }}>Sign in to join The Hunt</div>
          </Card>
        ) : (
          <>
            <InvitesBanner />
            {!crew ? (
              <CrewCreateWizard />
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <Pill active={seg === "missions"} onClick={() => setSeg("missions")}>MISSIONS</Pill>
                  <Pill active={seg === "challenges"} onClick={() => setSeg("challenges")}>
                    ⚡ CHALLENGES{activeChallenges.length > 0 ? ` (${activeChallenges.length})` : ""}
                  </Pill>
                  <Pill active={seg === "leaderboard"} onClick={() => setSeg("leaderboard")}>LEADERBOARD</Pill>
                </div>

                {seg === "missions" && (
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      <Pill active={!dayFilter} onClick={() => setDayFilter(null)}>All days</Pill>
                      {["1", "2", "3", "open"].map((d) => <Pill key={d} active={dayFilter === d} onClick={() => setDayFilter(d)}>{DAY_LABELS[d]}</Pill>)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {filteredMissions.map((m) => {
                        const isDone = crew.missionsCompleted.includes(m.id);
                        return (
                          <Card key={m.id} onClick={() => setOpenMission(m)} data-testid="mission-row" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 12, background: isDone ? theme.color.successBg : TYPE_ICON_BG[m.type], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                              {isDone ? "✓" : TYPE_LABELS[m.type].split(" ")[0]}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13.5, textDecoration: isDone ? "line-through" : "none", color: isDone ? theme.color.textMuted : theme.color.text }}>{m.title}</div>
                              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{isDone ? "Done ✓" : m.subtitle}</div>
                            </div>
                            <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: isDone ? theme.color.success : theme.color.pink }}>+{m.points}</div>
                          </Card>
                        );
                      })}
                      {filteredMissions.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14, textAlign: "center", padding: 20 }}>No missions match these filters.</div>}
                    </div>
                  </>
                )}

                {seg === "challenges" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {challenges.map((c) => {
                      const isDone = crew.challengesCompleted?.includes(c.id) ?? false;
                      const mySubmission = myChallengeSubmissions.find((s) => s.challengeId === c.id) ?? null;
                      const isActive = activeChallenge(c, now);
                      return (
                        <Card
                          key={c.id}
                          onClick={() => setOpenChallenge(c)}
                          style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, opacity: isActive || isDone ? 1 : 0.55, border: `1px solid ${isDone ? theme.color.success : theme.color.pink}33` }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: isDone ? theme.color.successBg : "#FFF0E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                            {isDone ? "✓" : "⚡"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.title}</div>
                            <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                              {isDone ? `Done ✓${mySubmission?.bonusPoints ? ` · +${mySubmission.bonusPoints} early-bird` : ""}` : mySubmission?.status === "pending" ? "Submitted — pending review" : !isActive ? (c.startsAt && now < c.startsAt ? `Opens ${new Date(c.startsAt).toLocaleDateString()}` : "Closed") : c.earlyBirdBonuses.length > 0 ? "⚡ Early-bird bonus available" : "Open now"}
                            </div>
                          </div>
                          <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: isDone ? theme.color.success : theme.color.orange }}>+{c.points}</div>
                        </Card>
                      );
                    })}
                    {challenges.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14, textAlign: "center", padding: 20 }}>No challenges yet — check back throughout the weekend.</div>}
                  </div>
                )}

                {seg === "leaderboard" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {leaderboard.map((c, i) => (
                      <Card key={c.id} onClick={() => setOpenCrewId(c.id)} data-testid="leaderboard-row" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontFamily: theme.font.display, fontWeight: 800, width: 28, fontSize: i < 3 ? 20 : 15 }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}{c.id === crew.id && " (you)"}</div>
                            <div style={{ fontSize: 12, color: theme.color.textMuted }}>{c.missionsCompleted.length + (c.challengesCompleted?.length ?? 0)} completed</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: theme.font.display, fontWeight: 800 }}>{c.points} pts</div>
                      </Card>
                    ))}
                    <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 8, textAlign: "center" }}>
                      Prizes: $500 grand · $150 runner-up · sponsor gift bags for top 5 · bonus points at facilitator discretion.
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {openMission && crew && <MissionDetailModal mission={openMission} crew={crew} onClose={() => setOpenMission(null)} />}
      {openChallenge && crew && (
        <ChallengeDetailModal
          challenge={openChallenge}
          crew={crew}
          mySubmission={myChallengeSubmissions.find((s) => s.challengeId === openChallenge.id) ?? null}
          onClose={() => setOpenChallenge(null)}
        />
      )}
      {openCrew && <CrewDetailModal crew={openCrew} missions={missions} onClose={() => setOpenCrewId(null)} />}
    </div>
  );
}
