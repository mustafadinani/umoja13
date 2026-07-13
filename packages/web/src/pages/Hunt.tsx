import { useState } from "react";
import type { HuntMissionType, HuntMission } from "@umoja/shared";
import { useAuth } from "../auth/AuthProvider";
import { theme, hunterGradient } from "../lib/theme";
import { useHuntCrews, useHuntMissions, useMyCrew } from "../hooks/useData";
import { Card, Pill } from "../components/ui";
import { CrewCreateWizard } from "./hunt/CrewCreateWizard";
import { InvitesBanner } from "./hunt/InvitesBanner";
import { MissionDetailModal } from "./hunt/MissionDetailModal";
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

const DAY_LABELS: Record<string, string> = { "1": "Day 1", "2": "Day 2", "3": "Day 3", open: "Open (all days)" };

export function Hunt() {
  const { user } = useAuth();
  const { data: missions } = useHuntMissions();
  const { data: crew } = useMyCrew(user?.uid);
  const { data: leaderboard } = useHuntCrews();
  const [seg, setSeg] = useState<"missions" | "leaderboard">("missions");
  const [typeFilter, setTypeFilter] = useState<HuntMissionType | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [openMission, setOpenMission] = useState<HuntMission | null>(null);
  const [openCrewId, setOpenCrewId] = useState<string | null>(null);

  const filteredMissions = missions.filter((m) => (!typeFilter || m.type === typeFilter) && (!dayFilter || m.day === dayFilter));
  const openCrew = leaderboard.find((c) => c.id === openCrewId) ?? null;

  return (
    <div>
      <div style={{ background: hunterGradient, color: "#fff", padding: "36px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 36 }}>THE HUNT</div>
          <div style={{ fontSize: 14, opacity: 0.92, marginTop: 6 }}>
            45 missions across 3 days. $500 grand prize at Sunday's ceremony.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
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
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{crew.name}</div>
                      <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>
                        {crew.members.filter((m) => m.status === "accepted").map((m) => m.name).join(" · ")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>{crew.points} pts</div>
                      <div style={{ fontSize: 12, color: theme.color.textMuted }}>{crew.missionsCompleted.length} done</div>
                    </div>
                  </div>
                </Card>

                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <Pill active={seg === "missions"} onClick={() => setSeg("missions")}>MISSIONS</Pill>
                  <Pill active={seg === "leaderboard"} onClick={() => setSeg("leaderboard")}>LEADERBOARD</Pill>
                </div>

                {seg === "missions" && (
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      <Pill active={!dayFilter} onClick={() => setDayFilter(null)}>All days</Pill>
                      {["1", "2", "3", "open"].map((d) => <Pill key={d} active={dayFilter === d} onClick={() => setDayFilter(d)}>{DAY_LABELS[d]}</Pill>)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {filteredMissions.map((m) => {
                        const isDone = crew.missionsCompleted.includes(m.id);
                        return (
                          <Card key={m.id} onClick={() => setOpenMission(m)} data-testid="mission-row" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: isDone ? 0.7 : 1 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{TYPE_LABELS[m.type]} {m.title}</div>
                              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{isDone ? "Done ✓" : m.subtitle}</div>
                            </div>
                            <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: theme.color.pink }}>+{m.points}</div>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}

                {seg === "leaderboard" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {leaderboard.map((c, i) => (
                      <Card key={c.id} onClick={() => setOpenCrewId(c.id)} data-testid="leaderboard-row" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontFamily: theme.font.display, fontWeight: 800, width: 24 }}>{i + 1}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}{c.id === crew.id && " (you)"}</div>
                            <div style={{ fontSize: 12, color: theme.color.textMuted }}>{c.missionsCompleted.length} missions</div>
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
      {openCrew && <CrewDetailModal crew={openCrew} missions={missions} onClose={() => setOpenCrewId(null)} />}
    </div>
  );
}
