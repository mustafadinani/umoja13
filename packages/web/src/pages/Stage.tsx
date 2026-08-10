import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  PLAYER_AWARD_ICONS,
  PLAYER_AWARD_LABELS,
  PLAYER_AWARD_TYPES,
  TEAM_AWARD_ICONS,
  TEAM_AWARD_LABELS,
  TEAM_AWARD_TYPES,
  categoryHasTeamAward,
  resolveTeamAward,
  type PlayerAwardType,
  type TeamAwardType,
} from "@umoja/shared";
import { useCategoryAwards, useGames, useTeams } from "../hooks/useData";

type Slide =
  | { categoryId: string; kind: "player"; type: PlayerAwardType }
  | { categoryId: string; kind: "team"; type: TeamAwardType };

// Every award, in tournament-category order — player awards first, then
// whichever team awards this category's bracket shape actually produces
// (Classic only exists for Men's Open; O40 has no Shield Final).
const SLIDES: Slide[] = CATEGORIES.flatMap((c) => [
  ...PLAYER_AWARD_TYPES.map((type) => ({ categoryId: c.id, kind: "player" as const, type })),
  ...TEAM_AWARD_TYPES.filter((t) => categoryHasTeamAward(c.id, t)).map((type) => ({ categoryId: c.id, kind: "team" as const, type })),
]);

/** Umoja13's actual flame-trophy gradient — used for the winner glow/eyebrow instead of generic gold. */
const FLAME = "linear-gradient(135deg, #F2A23A, #E23E82)";

// A ceremony screen is read from across a room, not a laptop's lap — every
// size here is deliberately huge and viewport-scaled (clamp'd on vw so it
// keeps filling the screen at any resolution) rather than the fixed small
// px values a normal in-app page uses.
const SIZE = {
  logo: "clamp(72px, 9vw, 160px)",
  categoryTag: "clamp(20px, 2.2vw, 34px)",
  title: "clamp(48px, 6.5vw, 96px)",
  subLabel: "clamp(18px, 2vw, 28px)",
  nomineeName: "clamp(22px, 2.6vw, 38px)",
  nomineeTeam: "clamp(16px, 1.8vw, 24px)",
  winnerEyebrow: "clamp(20px, 2.4vw, 32px)",
  winnerName: "clamp(56px, 8vw, 128px)",
  winnerTeam: "clamp(24px, 3vw, 42px)",
  winnerFooter: "clamp(18px, 2vw, 26px)",
  score: "clamp(22px, 2.8vw, 40px)",
  crestLabel: "clamp(18px, 2vw, 26px)",
};

export function Stage() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const slide = SLIDES[index];
  const category = CATEGORIES.find((c) => c.id === slide.categoryId)!;
  const { data: awards } = useCategoryAwards(slide.categoryId);
  const { data: teams } = useTeams(slide.categoryId);
  const { data: games } = useGames();

  useEffect(() => setRevealed(false), [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRevealed((r) => !r);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rosterByKey = useMemo(() => {
    const m = new Map<string, { selfieUrl?: string }>();
    for (const t of teams) for (const p of t.roster) m.set(p.playerKey ?? p.userId, { selfieUrl: p.selfieUrl });
    return m;
  }, [teams]);

  const teamNameById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#0B0A12", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes stageFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .stage-slide { animation: stageFadeIn 0.35s ease; }
        @media (prefers-reduced-motion: reduce) { .stage-slide { animation: none; } }
      `}</style>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "min(5vh, 60px) min(5vw, 80px)", minHeight: 0 }}>
        {slide.kind === "player" ? (
          <PlayerSlide
            key={index + String(revealed)}
            categoryLabel={category.label}
            type={slide.type}
            slot={awards?.player?.[slide.type]}
            revealed={revealed}
            photoFor={(playerKey) => rosterByKey.get(playerKey)?.selfieUrl}
          />
        ) : (
          <TeamSlide
            key={index + String(revealed)}
            categoryLabel={category.label}
            type={slide.type}
            resolved={resolveTeamAward(games, slide.categoryId, slide.type, awards?.teamOverrides?.[slide.type])}
            finalGame={games.find((g) => g.categoryId === slide.categoryId && g.round === "final" && g.bracket === (slide.type === "shield_winner" ? "shield" : slide.type === "classic_winner" ? "classic" : "cup"))}
            teamNameById={teamNameById}
            revealed={revealed}
          />
        )}
      </div>

      <StageControls
        index={index}
        total={SLIDES.length}
        revealed={revealed}
        onPrev={() => setIndex((i) => Math.max(i - 1, 0))}
        onNext={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
        onToggleReveal={() => setRevealed((r) => !r)}
        onJump={(i) => setIndex(i)}
      />
    </div>
  );
}

function StageLogo() {
  return <img src="/logo-icon.png" alt="Umoja13" style={{ height: SIZE.logo, width: "auto", marginBottom: "clamp(20px, 2.5vw, 40px)", opacity: 0.97 }} />;
}

function PlayerSlide({
  categoryLabel,
  type,
  slot,
  revealed,
  photoFor,
}: {
  categoryLabel: string;
  type: PlayerAwardType;
  slot?: { nominees: { playerKey: string; name: string; teamName: string }[]; winnerPlayerKey?: string };
  revealed: boolean;
  photoFor: (playerKey: string) => string | undefined;
}) {
  const nominees = slot?.nominees ?? [];
  const winner = nominees.find((n) => n.playerKey === slot?.winnerPlayerKey);

  if (nominees.length === 0) {
    return (
      <div className="stage-slide" style={{ textAlign: "center", color: "#8B87A3" }}>
        <StageLogo />
        <div style={{ fontSize: SIZE.subLabel, fontWeight: 700 }}>No nominees set yet for {categoryLabel} · {PLAYER_AWARD_LABELS[type]}</div>
      </div>
    );
  }

  if (revealed && winner) {
    return (
      <div className="stage-slide" style={{ textAlign: "center", position: "relative", color: "#F1EFFA", width: "100%" }}>
        <div style={{ position: "absolute", inset: "-40% -30%", background: "radial-gradient(circle at 50% 38%, rgba(242,162,58,0.26), rgba(226,62,130,0.10) 45%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <StageLogo />
          <div style={{ fontSize: SIZE.winnerEyebrow, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", backgroundImage: FLAME, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: "clamp(24px, 3vw, 48px)" }}>
            ✦ Winner ✦
          </div>
          <PhotoCircle name={winner.name} url={photoFor(winner.playerKey)} size="clamp(220px, 26vw, 460px)" ringGradient={FLAME} />
          <div style={{ fontSize: SIZE.winnerName, fontWeight: 800, marginTop: "clamp(24px, 3vw, 44px)", marginBottom: "clamp(8px, 1vw, 16px)", lineHeight: 1.1 }}>{winner.name}</div>
          <div style={{ fontSize: SIZE.winnerTeam, color: "#C9C4E6", fontWeight: 600 }}>{winner.teamName}</div>
          <div style={{ marginTop: "clamp(28px, 3.5vw, 52px)", fontSize: SIZE.winnerFooter, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B87A3" }}>
            {categoryLabel} · {PLAYER_AWARD_LABELS[type]}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-slide" style={{ textAlign: "center", color: "#F1EFFA", width: "100%" }}>
      <StageLogo />
      <div style={{ fontSize: SIZE.categoryTag, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A487F5", marginBottom: "clamp(14px, 1.6vw, 22px)" }}>{categoryLabel}</div>
      <div style={{ fontSize: SIZE.title, fontWeight: 800, marginBottom: "clamp(10px, 1.2vw, 18px)" }}>{PLAYER_AWARD_ICONS[type]} {PLAYER_AWARD_LABELS[type]}</div>
      <div style={{ fontSize: SIZE.subLabel, color: "#8B87A3", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "clamp(40px, 5vw, 72px)" }}>Nominees</div>
      <div style={{ display: "flex", gap: "clamp(32px, 4vw, 64px)", justifyContent: "center", flexWrap: "wrap" }}>
        {nominees.map((n) => (
          <div key={n.playerKey} style={{ width: "clamp(160px, 16vw, 260px)" }}>
            <PhotoCircle name={n.name} url={photoFor(n.playerKey)} size="clamp(120px, 13vw, 210px)" />
            <div style={{ fontSize: SIZE.nomineeName, fontWeight: 700, marginTop: "clamp(16px, 1.8vw, 26px)", lineHeight: 1.15 }}>{n.name}</div>
            <div style={{ fontSize: SIZE.nomineeTeam, color: "#8B87A3", marginTop: "clamp(4px, 0.6vw, 8px)" }}>{n.teamName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamSlide({
  categoryLabel,
  type,
  resolved,
  finalGame,
  teamNameById,
  revealed,
}: {
  categoryLabel: string;
  type: TeamAwardType;
  resolved?: { teamId: string };
  finalGame?: { homeTeamId: string; awayTeamId: string; homeScore?: number; awayScore?: number };
  teamNameById: Map<string, string>;
  revealed: boolean;
}) {
  if (!resolved || !finalGame) {
    return (
      <div className="stage-slide" style={{ textAlign: "center", color: "#8B87A3" }}>
        <StageLogo />
        <div style={{ fontSize: SIZE.subLabel, fontWeight: 700 }}>{categoryLabel} · {TEAM_AWARD_LABELS[type]} not decided yet</div>
      </div>
    );
  }

  const winnerId = resolved.teamId;
  const loserId = winnerId === finalGame.homeTeamId ? finalGame.awayTeamId : finalGame.homeTeamId;
  const winnerName = teamNameById.get(winnerId) ?? "Unknown team";
  const loserName = teamNameById.get(loserId) ?? "Unknown team";
  const isRunnerUpAward = type === "cup_runner_up";
  // For Cup Runner-Up, the *featured* team is the loser of the Cup Final.
  const featuredName = isRunnerUpAward ? loserName : winnerName;

  if (revealed) {
    return (
      <div className="stage-slide" style={{ textAlign: "center", position: "relative", color: "#F1EFFA", width: "100%" }}>
        <div style={{ position: "absolute", inset: "-40% -30%", background: "radial-gradient(circle at 50% 38%, rgba(242,162,58,0.26), rgba(226,62,130,0.10) 45%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <StageLogo />
          <div style={{ fontSize: SIZE.winnerEyebrow, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", backgroundImage: FLAME, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: "clamp(24px, 3vw, 48px)" }}>
            {TEAM_AWARD_ICONS[type]} {TEAM_AWARD_LABELS[type]}
          </div>
          <TeamCrest name={featuredName} size="clamp(190px, 22vw, 380px)" ringGradient={FLAME} />
          <div style={{ fontSize: SIZE.winnerName, fontWeight: 800, marginTop: "clamp(24px, 3vw, 44px)", lineHeight: 1.1 }}>{featuredName}</div>
          <div style={{ marginTop: "clamp(24px, 3vw, 44px)", fontSize: SIZE.winnerFooter, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B87A3" }}>{categoryLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-slide" style={{ textAlign: "center", color: "#F1EFFA", width: "100%" }}>
      <StageLogo />
      <div style={{ fontSize: SIZE.categoryTag, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A487F5", marginBottom: "clamp(14px, 1.6vw, 22px)" }}>{categoryLabel}</div>
      <div style={{ fontSize: SIZE.title, fontWeight: 800, marginBottom: "clamp(36px, 4.5vw, 64px)" }}>{TEAM_AWARD_ICONS[type]} {TEAM_AWARD_LABELS[type]}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(36px, 4.5vw, 72px)", justifyContent: "center", flexWrap: "wrap" }}>
        <div>
          <TeamCrest name={winnerName} size="clamp(110px, 11vw, 180px)" />
          <div style={{ fontSize: SIZE.nomineeName, fontWeight: 700, marginTop: "clamp(14px, 1.6vw, 22px)" }}>{winnerName}</div>
          <div style={{ fontSize: SIZE.crestLabel, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "clamp(6px, 0.8vw, 10px)", backgroundImage: FLAME, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Champion
          </div>
        </div>
        <div style={{ fontSize: SIZE.score, fontWeight: 700, color: "#8B87A3" }}>{finalGame.homeTeamId === winnerId ? `${finalGame.homeScore ?? 0} – ${finalGame.awayScore ?? 0}` : `${finalGame.awayScore ?? 0} – ${finalGame.homeScore ?? 0}`}</div>
        <div>
          <TeamCrest name={loserName} size="clamp(110px, 11vw, 180px)" />
          <div style={{ fontSize: SIZE.nomineeName, fontWeight: 700, marginTop: "clamp(14px, 1.6vw, 22px)" }}>{loserName}</div>
          <div style={{ fontSize: SIZE.crestLabel, fontWeight: 700, color: "#8B87A3", marginTop: "clamp(6px, 0.8vw, 10px)" }}>Runner-Up</div>
        </div>
      </div>
    </div>
  );
}

function PhotoCircle({ name, url, size, ringGradient }: { name: string; url?: string; size: string; ringGradient?: string }) {
  const border = ringGradient
    ? { border: "clamp(3px, 0.4vw, 6px) solid transparent", backgroundImage: `linear-gradient(#241F38,#241F38), ${ringGradient}`, backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }
    : { border: "clamp(2px, 0.25vw, 3px) solid #453B6E" };
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #3A3358, #241F38)",
        color: "#766EA8",
        fontSize: `calc(${size} * 0.34)`,
        fontWeight: 800,
        ...border,
      }}
    >
      {url ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function TeamCrest({ name, size, ringGradient }: { name: string; size: string; ringGradient?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: `calc(${size} * 0.22)`,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ringGradient ?? "linear-gradient(145deg, #453B6E, #2C2547)",
        color: "#fff",
        fontSize: `calc(${size} * 0.36)`,
        fontWeight: 900,
        boxShadow: "0 14px 30px -10px rgba(0,0,0,0.5)",
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function StageControls({
  index,
  total,
  revealed,
  onPrev,
  onNext,
  onToggleReveal,
  onJump,
}: {
  index: number;
  total: number;
  revealed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleReveal: () => void;
  onJump: (i: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 18px",
        background: "rgba(255,255,255,0.04)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        color: "#8B87A3",
        fontSize: 12,
        flexWrap: "wrap",
        flexShrink: 0,
      }}
    >
      <button onClick={onPrev} disabled={index === 0} style={ctrlBtnStyle}>‹ Prev</button>
      <select
        value={index}
        onChange={(e) => onJump(Number(e.target.value))}
        style={{ background: "#1A1826", color: "#C9C4E6", border: "1px solid #2C2840", borderRadius: 7, padding: "5px 8px", fontSize: 11.5, maxWidth: 260 }}
      >
        {SLIDES.map((s, i) => {
          const cat = CATEGORIES.find((c) => c.id === s.categoryId)!;
          const label = s.kind === "player" ? PLAYER_AWARD_LABELS[s.type] : TEAM_AWARD_LABELS[s.type];
          return (
            <option key={i} value={i}>
              {cat.label} — {label}
            </option>
          );
        })}
      </select>
      <button onClick={onNext} disabled={index === total - 1} style={ctrlBtnStyle}>Next ›</button>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{index + 1} / {total}</span>
      <button
        onClick={onToggleReveal}
        style={{ ...ctrlBtnStyle, marginLeft: "auto", backgroundImage: FLAME, color: "#2A0E1C", fontWeight: 800, border: "none" }}
      >
        {revealed ? "↩ Show nominees" : "✨ Reveal winner"}
      </button>
      <span style={{ color: "#5A5674" }}>← → to navigate · space to reveal</span>
    </div>
  );
}

const ctrlBtnStyle: React.CSSProperties = {
  background: "#1A1826",
  color: "#C9C4E6",
  border: "1px solid #2C2840",
  borderRadius: 7,
  padding: "6px 12px",
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
};
