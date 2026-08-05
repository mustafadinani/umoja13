import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { theme, heroGradient, hunterGradient } from "../lib/theme";
import { useIsMobile } from "../hooks/useMediaQuery";
import { useAnnouncements, useGames, useHuntCrews, useMoments, useSponsors, useTeams } from "../hooks/useData";
import { Card } from "../components/ui";
import { CATEGORIES, VENUE } from "@umoja/shared";
import { AnnouncementModal } from "../components/AnnouncementModal";
import { BecomeVolunteerModal } from "../components/BecomeVolunteerModal";
import { SponsorStrip } from "../components/SponsorStrip";
import { SponsorshipCheckoutModal } from "../components/SponsorshipCheckoutModal";

export function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const { data: moments } = useMoments();
  const { data: announcements } = useAnnouncements();
  const { data: crews } = useHuntCrews();
  const { data: sponsors } = useSponsors();
  const [openAnnouncementId, setOpenAnnouncementId] = useState<string | null>(null);
  const [volunteerOpen, setVolunteerOpen] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const liveGame = games.find((g) => g.status === "live");
  const upNext = useMemo(
    () =>
      games
        .filter((g) => g.status === "scheduled")
        .sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime))
        .slice(0, 3),
    [games]
  );
  const topCrews = crews.slice(0, 3);
  const openAnnouncement = announcements.find((a) => a.id === openAnnouncementId) ?? null;

  return (
    <div>
      <div style={{ background: heroGradient, color: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px 32px" : "44px 24px 40px", display: "flex", alignItems: "flex-end", gap: isMobile ? 24 : 40, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <img src="/logo-icon.png" alt="" style={{ height: isMobile ? 44 : 54, width: "auto", marginBottom: 12 }} />
            <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: 2, opacity: 0.85 }}>
              {VENUE.name.toUpperCase()} · {VENUE.dates.toUpperCase()}
            </div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 36 : 56, lineHeight: 0.98, marginTop: 10 }}>
              UNITED WE STAND.<br />TOGETHER WE WIN.
            </div>
            <div style={{ marginTop: 14, fontSize: isMobile ? 15 : 17, opacity: 0.9, maxWidth: 520 }}>
              Three days, {teams.length ? new Set(teams.map((t) => t.categoryId)).size : 14} categories, one community. Follow every game, share every moment.
            </div>
            <div className="hero-cta-row">
              <button
                onClick={() => navigate("/schedule")}
                style={{ background: "#fff", color: theme.color.navy, fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 15 : 18, letterSpacing: 1, padding: isMobile ? "11px 18px" : "13px 26px", borderRadius: 12, border: "none", cursor: "pointer" }}
              >
                TODAY'S GAMES
              </button>
              <button
                onClick={() => navigate("/moments")}
                style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.4)", color: "#fff", fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 15 : 18, letterSpacing: 1, padding: isMobile ? "11px 18px" : "13px 26px", borderRadius: 12, cursor: "pointer" }}
              >
                FRESH MOMENTS
              </button>
              <button
                onClick={() => (user ? setVolunteerOpen(true) : navigate("/signup"))}
                style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.4)", color: "#fff", fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 15 : 18, letterSpacing: 1, padding: isMobile ? "11px 18px" : "13px 26px", borderRadius: 12, cursor: "pointer" }}
              >
                🙋 BECOME A VOLUNTEER
              </button>
              <button
                onClick={() => setSponsorOpen(true)}
                style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.4)", color: "#fff", fontFamily: theme.font.display, fontWeight: 800, fontSize: isMobile ? 15 : 18, letterSpacing: 1, padding: isMobile ? "11px 18px" : "13px 26px", borderRadius: 12, cursor: "pointer" }}
              >
                🤝 BECOME A SPONSOR
              </button>
            </div>
          </div>
          {liveGame && (
            <div
              onClick={() => navigate(`/game/${liveGame.id}`)}
              style={{ width: isMobile ? "100%" : 340, maxWidth: "100%", background: "rgba(17,12,32,.35)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 18, padding: 18, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF7A8A", animation: "umPulse 1.6s infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: theme.color.gold }}>
                  LIVE · {liveGame.field}
                </span>
              </div>
              <GameScoreRow game={liveGame} teamById={teamById} />
            </div>
          )}
        </div>
      </div>

      {profile && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 16px 0" : "20px 24px 0" }}>
          <div
            onClick={() => navigate("/dashboard")}
            style={{ background: theme.color.navy, color: "#fff", borderRadius: 16, padding: "16px 22px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(120deg, ${theme.color.purple}, ${theme.color.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 17 }}>
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>My Dashboard</div>
              <div style={{ fontSize: 13.5, color: "#A79FC0" }}>Viewing as {profile.primaryRole}</div>
            </div>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 17, color: theme.color.gold, letterSpacing: 1 }}>OPEN →</div>
          </div>
        </div>
      )}

      <div className="page-shell grid-2">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <SectionHeader title="UP NEXT TODAY" actionLabel="Full schedule →" onAction={() => navigate("/schedule")} />
            <div className="grid-3">
              {upNext.map((g) => {
                const home = teamById.get(g.homeTeamId);
                const away = teamById.get(g.awayTeamId);
                return (
                  <Card key={g.id} onClick={() => navigate(`/game/${g.id}`)}>
                    <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginBottom: 8 }}>
                      {CATEGORIES.find((c) => c.id === (home?.categoryId ?? g.categoryId))?.label ?? g.categoryId} · {g.field}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{home?.name ?? "TBD"}</div>
                    <div style={{ fontSize: 12, color: theme.color.textMuted, margin: "2px 0" }}>vs</div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{away?.name ?? "TBD"}</div>
                    <div style={{ marginTop: 10, fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, color: theme.color.purple }}>
                      {g.kickoffTime}
                    </div>
                  </Card>
                );
              })}
              {upNext.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No upcoming games scheduled yet.</div>}
            </div>
          </div>
          <div>
            <SectionHeader title="FRESH MOMENTS" actionLabel="See all →" onAction={() => navigate("/moments")} />
            <div className="grid-3">
              {moments.slice(0, 3).map((m) => (
                <Card key={m.id} style={{ padding: 0, overflow: "hidden" }} onClick={() => navigate("/moments")}>
                  <div style={{ height: 110, background: theme.color.purple, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: theme.font.display, fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>
                    {m.source.toUpperCase()}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.caption}</div>
                    <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{m.postedByName}</div>
                  </div>
                </Card>
              ))}
              {moments.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No moments yet — be the first to share one.</div>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 19, marginBottom: 10 }}>ANNOUNCEMENTS</div>
            {announcements.map((a) => (
              <div key={a.id} onClick={() => setOpenAnnouncementId(a.id)} style={{ padding: "10px 0", borderBottom: `1px solid #F1EFF5`, cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>
                  <span style={{ color: theme.color.blue, fontWeight: 600 }}>Read more</span>
                </div>
              </div>
            ))}
            {announcements.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No announcements yet.</div>}
          </Card>
          <div style={{ background: hunterGradient, color: "#fff", borderRadius: 16, padding: 18, cursor: "pointer" }} onClick={() => navigate("/hunt")}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, letterSpacing: 0.5 }}>JOIN THE HUNT</div>
            <div style={{ fontSize: 13.5, opacity: 0.92, margin: "6px 0 12px" }}>45 missions across 3 days. $500 grand prize at Sunday's ceremony.</div>
            {topCrews.map((c, i) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.3)" }}>
                <span>{i + 1}. {c.name}</span>
                <span>{c.points} pts</span>
              </div>
            ))}
            {topCrews.length === 0 && <div style={{ fontSize: 13, opacity: 0.85 }}>Be the first crew on the board.</div>}
          </div>
        </div>
      </div>

      <div className="page-shell" style={{ paddingTop: 0 }}>
        <SponsorStrip sponsors={sponsors} />
      </div>

      {openAnnouncement && <AnnouncementModal announcement={openAnnouncement} onClose={() => setOpenAnnouncementId(null)} />}
      {volunteerOpen && <BecomeVolunteerModal onClose={() => setVolunteerOpen(false)} />}
      {sponsorOpen && <SponsorshipCheckoutModal onClose={() => setSponsorOpen(false)} />}
    </div>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 24, letterSpacing: 0.5 }}>{title}</div>
      <div onClick={onAction} style={{ fontSize: 14, fontWeight: 600, color: theme.color.blue, cursor: "pointer" }}>{actionLabel}</div>
    </div>
  );
}

function GameScoreRow({ game, teamById }: { game: import("@umoja/shared").Game; teamById: Map<string, import("@umoja/shared").Team> }) {
  const home = teamById.get(game.homeTeamId);
  const away = teamById.get(game.awayTeamId);
  const homeGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.homeTeamId).length;
  const awayGoals = game.events.filter((e) => e.type === "goal" && e.teamId === game.awayTeamId).length;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, textAlign: "center", color: "#fff" }}>
        <div>
          <div style={{ width: 46, height: 46, margin: "0 auto 6px", borderRadius: "50%", background: home?.color ?? theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 17 }}>
            {(home?.name ?? "TBD").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{home?.name ?? "TBD"}</div>
        </div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 44, letterSpacing: 2, whiteSpace: "nowrap" }}>
          {homeGoals}–{awayGoals}
        </div>
        <div>
          <div style={{ width: 46, height: 46, margin: "0 auto 6px", borderRadius: "50%", background: away?.color ?? theme.color.teal, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font.display, fontWeight: 800, fontSize: 17 }}>
            {(away?.name ?? "TBD").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{away?.name ?? "TBD"}</div>
        </div>
      </div>
    </>
  );
}
