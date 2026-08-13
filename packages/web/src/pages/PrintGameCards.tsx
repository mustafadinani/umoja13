import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CATEGORIES, compareGamesByKickoff, formatKickoffTime, provisionalSideLabel, type Game } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useAllUsers, useGames, useTeams } from "../hooks/useData";

type CardSize = "half" | "quarter";

const DAY_LABEL: Record<Game["day"], string> = { fri: "Friday", sat: "Saturday", sun: "Sunday" };

interface GameCardData {
  gameNumber: number;
  day: string;
  time: string;
  field: string;
  category: string;
  official: string;
  homeName: string;
  awayName: string;
}

/**
 * Printable Game Card — replaces the manual copy-into-a-spreadsheet prep
 * with one click from the Schedule (AllGamesTab / RefereeDashboard). This is
 * deliberately NOT a digital data-entry form: it generates the exact paper
 * layout referees already fill out by hand during a match (goal scorers,
 * cards, checked in at half time, pennies, coaches, final score, Player of
 * the Game), pre-filled only with what the schedule already knows —
 * day/field/time/category/official/team names. No new Firestore data, no
 * backend changes: everything after printing (filling it in, photographing
 * it via the existing Referee Console "Submit Game Card" step, commissioner
 * sign-off) is unchanged.
 *
 * Route: /print/game-cards?ids=<comma-separated game ids>&size=half|quarter
 * Chrome-free (see Layout.tsx's "/print" check) so the site nav never ends
 * up in the printed output.
 */
export function PrintGameCards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ids = useMemo(() => (searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean), [searchParams]);
  const [size, setSize] = useState<CardSize>(searchParams.get("size") === "half" ? "half" : "quarter");
  const { data: games, loading: gamesLoading } = useGames();
  const { data: teams, loading: teamsLoading } = useTeams();
  const { data: users, loading: usersLoading } = useAllUsers();
  const loading = gamesLoading || teamsLoading || usersLoading;
  const printedOnceRef = useRef(false);

  function setSizeAndUrl(next: CardSize) {
    setSize(next);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("size", next);
      return p;
    });
  }

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);

  const selectedGames = useMemo(
    () => games.filter((g) => ids.includes(g.id)).sort(compareGamesByKickoff),
    [games, ids]
  );

  const cards: GameCardData[] = useMemo(
    () =>
      selectedGames.map((g, i) => {
        const home = teamById.get(g.homeTeamId);
        const away = teamById.get(g.awayTeamId);
        const refNames = (g.refereeUids ?? []).map((uid) => userById.get(uid)?.displayName?.trim()).filter(Boolean);
        return {
          gameNumber: i + 1,
          day: DAY_LABEL[g.day],
          time: formatKickoffTime(g.kickoffTime),
          field: g.field,
          category: CATEGORIES.find((c) => c.id === g.categoryId)?.label ?? g.categoryId,
          official: refNames.length > 0 ? refNames.join(" / ") : "No official assigned",
          homeName: home?.name ?? provisionalSideLabel(g.homeDrawPos, g.homeRef) ?? "TBD",
          awayName: away?.name ?? provisionalSideLabel(g.awayDrawPos, g.awayRef) ?? "TBD",
        };
      }),
    [selectedGames, teamById, userById]
  );

  // Auto-open the print dialog once data's actually loaded — this route
  // only ever gets opened to print, so asking the admin/referee to also
  // find and click a button is one extra step for zero benefit. The button
  // stays visible too, for reprints or after they dismiss the dialog.
  useEffect(() => {
    if (!loading && cards.length > 0 && !printedOnceRef.current) {
      printedOnceRef.current = true;
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading, cards.length]);

  const perPage = size === "half" ? 2 : 4;
  const pages: GameCardData[][] = [];
  for (let i = 0; i < cards.length; i += perPage) pages.push(cards.slice(i, i + perPage));

  return (
    <div style={{ minHeight: "100vh", background: "#5B5666", padding: "24px 0" }}>
      <style>{`
        @page { size: letter; margin: 0.2in; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page-bg { background: none !important; padding: 0 !important; }
          .print-sheet { box-shadow: none !important; margin: 0 auto !important; break-after: page; page-break-after: always; }
          .print-sheet:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 640, margin: "0 auto 20px", background: "#fff", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 16, flex: 1, minWidth: 160 }}>
          {cards.length === 0 ? "Print game card" : `Printing ${cards.length} game card${cards.length === 1 ? "" : "s"}`}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <SizeButton active={size === "quarter"} onClick={() => setSizeAndUrl("quarter")}>Quarter letter</SizeButton>
          <SizeButton active={size === "half"} onClick={() => setSizeAndUrl("half")}>Half letter</SizeButton>
        </div>
        <button
          onClick={() => window.print()}
          disabled={cards.length === 0}
          style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 800, fontSize: 12.5, cursor: cards.length === 0 ? "default" : "pointer", opacity: cards.length === 0 ? 0.5 : 1 }}
        >
          🖨 Print
        </button>
      </div>
      {!loading && cards.length === 0 && (
        <div className="no-print" style={{ maxWidth: 640, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 20, color: theme.color.textMuted, fontSize: 14 }}>
          No games selected to print — go back to the Schedule and use "Print game card" there.
        </div>
      )}
      <div className="no-print" style={{ maxWidth: 640, margin: "10px auto 0", color: "#D8D5E0", fontSize: 11.5, textAlign: "center" }}>
        For a clean edge-to-edge result, set your browser's print dialog margins to "None"/"Minimum" and scale to 100%.
      </div>

      <div className="print-page-bg" style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center", marginTop: 20 }}>
        {pages.map((pageCards, pageIndex) => (
          <div
            key={pageIndex}
            className="print-sheet"
            style={{
              background: "#fff",
              boxShadow: "0 20px 50px -20px rgba(0,0,0,.5)",
              width: "8.1in",
              minHeight: "10.6in",
              display: size === "half" ? "flex" : "grid",
              flexDirection: size === "half" ? "column" : undefined,
              gridTemplateColumns: size === "quarter" ? "1fr 1fr" : undefined,
            }}
          >
            {pageCards.map((card) => (
              <GameCardSheet key={card.gameNumber} card={card} size={size} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SizeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${active ? theme.color.purple : theme.color.border}`,
        background: active ? theme.color.purple : "#fff",
        color: active ? "#fff" : theme.color.text,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const ink = "#23202B";
const rule = "#B9B3C4";
const muted = "#6b6572";
const serif = "Georgia, 'Times New Roman', serif";

function FieldBlank({ label, lines = 1 }: { label: string; lines?: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: muted, marginBottom: 3 }}>{label}</div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ borderBottom: `1px dotted ${rule}`, height: 13, marginTop: i > 0 ? 3 : 0 }} />
      ))}
    </div>
  );
}

/** One team's block of fields — same six fields whether laid out side-by-side (half letter) or stacked (quarter letter). */
function TeamFields({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", borderBottom: `1px solid ${ink}`, paddingBottom: 4, marginBottom: 8 }}>
        {label} — {name}
      </div>
      <FieldBlank label="Goal scorers" lines={2} />
      <FieldBlank label="Yellow cards" />
      <FieldBlank label="Red cards" />
      <FieldBlank label="Checked in at half time" />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><FieldBlank label="# of Pennies" /></div>
        <div style={{ flex: 1 }}><FieldBlank label="# of Coaches" /></div>
      </div>
    </div>
  );
}

function GameCardSheet({ card, size }: { card: GameCardData; size: CardSize }) {
  const isHalf = size === "half";
  return (
    <div
      style={{
        width: isHalf ? "100%" : undefined,
        height: isHalf ? "5.3in" : "5.3in",
        padding: isHalf ? "0.22in 0.28in" : "0.18in 0.2in",
        boxSizing: "border-box",
        fontFamily: serif,
        color: ink,
        borderBottom: isHalf ? undefined : undefined,
        display: "flex",
        flexDirection: "column",
        breakInside: "avoid",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${ink}`, paddingBottom: 6, marginBottom: isHalf ? 10 : 6 }}>
        <span style={{ fontWeight: 800, fontSize: isHalf ? 15 : 12.5 }}>GAME CARD</span>
        <span style={{ fontWeight: 800, fontSize: isHalf ? 13 : 11 }}>Game #{card.gameNumber}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isHalf ? "repeat(4, 1fr)" : "1fr 1fr",
          gap: isHalf ? "6px 12px" : "2px 8px",
          fontSize: isHalf ? 11 : 8.5,
          marginBottom: isHalf ? 12 : 7,
        }}
      >
        <MetaField label="Day" value={card.day} />
        <MetaField label="Time" value={card.time} />
        <MetaField label="Field" value={card.field} />
        <MetaField label="Category" value={card.category} />
        <div style={{ gridColumn: "1 / -1" }}><MetaField label="Official" value={card.official} /></div>
      </div>

      {isHalf ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 12, flex: 1 }}>
          <TeamFields label="Home" name={card.homeName} />
          <TeamFields label="Away" name={card.awayName} />
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <TeamFields label="Home" name={card.homeName} />
          <TeamFields label="Away" name={card.awayName} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isHalf ? 16 : 8,
          padding: isHalf ? "10px 0" : "5px 0",
          borderTop: `1px solid ${ink}`,
          borderBottom: `1px solid ${ink}`,
          marginBottom: isHalf ? 12 : 6,
          fontSize: isHalf ? 12 : 9,
          fontWeight: 800,
        }}
      >
        <span>{card.homeName}</span>
        <div style={{ width: isHalf ? 44 : 22, height: isHalf ? 32 : 16, border: `1px solid ${ink}` }} />
        <span>–</span>
        <div style={{ width: isHalf ? 44 : 22, height: isHalf ? 32 : 16, border: `1px solid ${ink}` }} />
        <span>{card.awayName}</span>
      </div>

      <div style={{ display: "flex", gap: isHalf ? 20 : 8 }}>
        <div style={{ flex: 1 }}><FieldBlank label="Player of the Game — Name / Number" /></div>
        <div style={{ flex: 1 }}><FieldBlank label="Player of the Game — Team" /></div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "0.85em", color: muted }}>{label}: </span>
      <span>{value}</span>
    </div>
  );
}
