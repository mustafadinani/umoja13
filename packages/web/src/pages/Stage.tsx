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
    <div style={{ minHeight: "100vh", background: "#0B0A12", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes stageFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .stage-slide { animation: stageFadeIn 0.35s ease; }
        @media (prefers-reduced-motion: reduce) { .stage-slide { animation: none; } }
      `}</style>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
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
  return <img src="/logo-icon.png" alt="Umoja13" style={{ height: 34, width: "auto", marginBottom: 16, opacity: 0.96 }} />;
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>No nominees set yet for {categoryLabel} · {PLAYER_AWARD_LABELS[type]}</div>
      </div>
    );
  }

  if (revealed && winner) {
    return (
      <div className="stage-slide" style={{ textAlign: "center", position: "relative", color: "#F1EFFA" }}>
        <div style={{ position: "absolute", inset: "-40% -30%", background: "radial-gradient(circle at 50% 38%, rgba(242,162,58,0.26), rgba(226,62,130,0.10) 45%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <StageLogo />
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", backgroundImage: FLAME, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: 20 }}>
            ✦ Winner ✦
          </div>
          <PhotoCircle name={winner.name} url={photoFor(winner.playerKey)} size={168} ringGradient={FLAME} />
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 22, marginBottom: 6 }}>{winner.name}</div>
          <div style={{ fontSize: 15, color: "#C9C4E6", fontWeight: 600 }}>{winner.teamName}</div>
          <div style={{ marginTop: 26, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B87A3" }}>
            {categoryLabel} · {PLAYER_AWARD_LABELS[type]}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-slide" style={{ textAlign: "center", color: "#F1EFFA" }}>
      <StageLogo />
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A487F5", marginBottom: 10 }}>{categoryLabel}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{PLAYER_AWARD_ICONS[type]} {PLAYER_AWARD_LABELS[type]}</div>
      <div style={{ fontSize: 12, color: "#8B87A3", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 32 }}>Nominees</div>
      <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
        {nominees.map((n) => (
          <div key={n.playerKey} style={{ width: 130 }}>
            <PhotoCircle name={n.name} url={photoFor(n.playerKey)} size={88} />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12 }}>{n.name}</div>
            <div style={{ fontSize: 11.5, color: "#8B87A3", marginTop: 2 }}>{n.teamName}</div>
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>{categoryLabel} · {TEAM_AWARD_LABELS[type]} not decided yet</div>
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
      <div className="stage-slide" style={{ textAlign: "center", position: "relative", color: "#F1EFFA" }}>
        <div style={{ position: "absolute", inset: "-40% -30%", background: "radial-gradient(circle at 50% 38%, rgba(242,162,58,0.26), rgba(226,62,130,0.10) 45%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <StageLogo />
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", backgroundImage: FLAME, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: 20 }}>
            {TEAM_AWARD_ICONS[type]} {TEAM_AWARD_LABELS[type]}
          </div>
          <TeamCrest name={featuredName} size={140} ringGradient={FLAME} />
          <div style={{ fontSize: 38, fontWeight: 800, marginTop: 22 }}>{featuredName}</div>
          <div style={{ marginTop: 22, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B87A3" }}>{categoryLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-slide" style={{ textAlign: "center", color: "#F1EFFA" }}>
      <StageLogo />
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A487F5", marginBottom: 10 }}>{categoryLabel}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 26 }}>{TEAM_AWARD_ICONS[type]} {TEAM_AWARD_LABELS[type]}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, justifyContent: "center" }}>
        <div>
          <TeamCrest name={winnerName} size={72} />
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{winnerName}</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4, backgroundImage: FLAME, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Champion
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#8B87A3" }}>{finalGame.homeTeamId === winnerId ? `${finalGame.homeScore ?? 0} – ${finalGame.awayScore ?? 0}` : `${finalGame.awayScore ?? 0} – ${finalGame.homeScore ?? 0}`}</div>
        <div>
          <TeamCrest name={loserName} size={72} />
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{loserName}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8B87A3", marginTop: 4 }}>Runner-Up</div>
        </div>
      </div>
    </div>
  );
}

function PhotoCircle({ name, url, size, ringGradient }: { name: string; url?: string; size: number; ringGradient?: string }) {
  const border = ringGradient ? { border: "3px solid transparent", backgroundImage: `linear-gradient(#241F38,#241F38), ${ringGradient}`, backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" } : { border: "1.5px solid #453B6E" };
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
        fontSize: size * 0.34,
        fontWeight: 800,
        ...border,
      }}
    >
      {url ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function TeamCrest({ name, size, ringGradient }: { name: string; size: number; ringGradient?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ringGradient ?? "linear-gradient(145deg, #453B6E, #2C2547)",
        color: "#fff",
        fontSize: size * 0.36,
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
