import { useMemo, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import {
  CATEGORIES,
  COLLECTIONS,
  MAX_PLAYER_AWARD_NOMINEES,
  PLAYER_AWARD_ICONS,
  PLAYER_AWARD_LABELS,
  PLAYER_AWARD_TYPES,
  TEAM_AWARD_ICONS,
  TEAM_AWARD_LABELS,
  TEAM_AWARD_TYPES,
  categoryHasTeamAward,
  resolveTeamAward,
  type PlayerAwardNominee,
  type PlayerAwardType,
  type TeamAwardOverride,
  type TeamAwardType,
} from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useAllCategoryAwards, useCategoryAwards, useGames, useTeams } from "../../../hooks/useData";
import { Card } from "../../../components/ui";

interface FlatPlayer {
  playerKey: string;
  name: string;
  teamId: string;
  teamName: string;
  selfieUrl?: string;
}

// Stable reference so a category with no nominees yet doesn't produce a new
// array every render (which would defeat the useMemo below it feeds).
const NO_NOMINEES: PlayerAwardNominee[] = [];

export function AwardsAdminTab() {
  const [categoryId, setCategoryId] = useState<string>(CATEGORIES[0].id);
  const { data: allAwards } = useAllCategoryAwards();
  const { data: awards } = useCategoryAwards(categoryId);
  const { data: teams } = useTeams(categoryId);
  const { data: games } = useGames();

  const awardsByCategory = useMemo(() => new Map(allAwards.map((a) => [a.categoryId, a])), [allAwards]);
  const applicableTeamAwards = useMemo(
    () => TEAM_AWARD_TYPES.filter((t) => categoryHasTeamAward(categoryId, t)),
    [categoryId]
  );

  const roster = useMemo<FlatPlayer[]>(
    () =>
      teams.flatMap((t) =>
        t.roster.map((p) => ({
          playerKey: p.playerKey ?? p.userId,
          name: p.displayName,
          teamId: t.id,
          teamName: t.name,
          selfieUrl: p.selfieUrl,
        }))
      ),
    [teams]
  );

  async function savePlayerSlot(type: PlayerAwardType, nominees: PlayerAwardNominee[], winnerPlayerKey?: string) {
    await setDoc(
      doc(db, COLLECTIONS.categoryAwards, categoryId),
      {
        categoryId,
        updatedAt: Date.now(),
        player: { ...(awards?.player ?? {}), [type]: { nominees, winnerPlayerKey } },
      },
      { merge: true }
    );
  }

  async function saveOverride(type: TeamAwardType, override: TeamAwardOverride | null) {
    const next = { ...(awards?.teamOverrides ?? {}) };
    if (override) next[type] = override;
    else delete next[type];
    await setDoc(
      doc(db, COLLECTIONS.categoryAwards, categoryId),
      { categoryId, updatedAt: Date.now(), teamOverrides: next },
      { merge: true }
    );
  }

  function categoryStatus(catId: string): "done" | "partial" | "none" {
    const a = awardsByCategory.get(catId);
    const playerDone = PLAYER_AWARD_TYPES.every((t) => a?.player?.[t]?.winnerPlayerKey);
    const teamAwardsHere = TEAM_AWARD_TYPES.filter((t) => categoryHasTeamAward(catId, t));
    const teamDone = teamAwardsHere.every((t) => resolveTeamAward(games, catId, t, a?.teamOverrides?.[t]));
    if (playerDone && teamDone) return "done";
    const playerStarted = PLAYER_AWARD_TYPES.some((t) => (a?.player?.[t]?.nominees.length ?? 0) > 0);
    const teamStarted = teamAwardsHere.some((t) => resolveTeamAward(games, catId, t, a?.teamOverrides?.[t]));
    return playerStarted || teamStarted ? "partial" : "none";
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ minWidth: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: theme.color.textMuted, padding: "4px 6px 10px" }}>
          Categories
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {CATEGORIES.map((c) => {
            const status = categoryStatus(c.id);
            return (
              <div
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: categoryId === c.id ? 800 : 600,
                  color: categoryId === c.id ? theme.color.purple : theme.color.textMuted,
                  background: categoryId === c.id ? "#F1EFF5" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: status === "done" ? theme.color.success : status === "partial" ? theme.color.gold : theme.color.border,
                  }}
                />
                {c.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 320 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 18 }}>
          {CATEGORIES.find((c) => c.id === categoryId)?.label}
        </div>

        <SectionLabel>🎖 Player awards</SectionLabel>
        {PLAYER_AWARD_TYPES.map((type) => (
          <PlayerAwardCard
            key={type}
            type={type}
            roster={roster}
            slot={awards?.player?.[type]}
            onChange={(nominees, winnerPlayerKey) => void savePlayerSlot(type, nominees, winnerPlayerKey)}
          />
        ))}

        <SectionLabel>
          🏆 Team awards <span style={{ fontWeight: 500, color: theme.color.textMuted, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>— auto-filled from Final results</span>
        </SectionLabel>
        <Card style={{ padding: "6px 16px" }}>
          {TEAM_AWARD_TYPES.map((type) => (
            <TeamAwardRow
              key={type}
              type={type}
              applicable={applicableTeamAwards.includes(type)}
              teams={teams}
              games={games}
              categoryId={categoryId}
              override={awards?.teamOverrides?.[type]}
              onOverride={(o) => void saveOverride(type, o)}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", margin: "22px 0 10px" }}>
      {children}
    </div>
  );
}

function PlayerAwardCard({
  type,
  roster,
  slot,
  onChange,
}: {
  type: PlayerAwardType;
  roster: FlatPlayer[];
  slot?: { nominees: PlayerAwardNominee[]; winnerPlayerKey?: string };
  onChange: (nominees: PlayerAwardNominee[], winnerPlayerKey?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const nominees = slot?.nominees ?? NO_NOMINEES;
  const winnerPlayerKey = slot?.winnerPlayerKey;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return roster
      .filter((p) => !nominees.some((n) => n.playerKey === p.playerKey))
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, roster, nominees]);

  function addNominee(p: FlatPlayer) {
    if (nominees.length >= MAX_PLAYER_AWARD_NOMINEES) return;
    const next = [...nominees, { playerKey: p.playerKey, name: p.name, teamId: p.teamId, teamName: p.teamName }];
    onChange(next, winnerPlayerKey);
    setQuery("");
  }

  function removeNominee(playerKey: string) {
    const next = nominees.filter((n) => n.playerKey !== playerKey);
    onChange(next, winnerPlayerKey === playerKey ? undefined : winnerPlayerKey);
  }

  function toggleWinner(playerKey: string) {
    onChange(nominees, winnerPlayerKey === playerKey ? undefined : playerKey);
  }

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{PLAYER_AWARD_ICONS[type]}</span>
        <span style={{ fontWeight: 800, fontSize: 13.5 }}>{PLAYER_AWARD_LABELS[type]}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            fontWeight: 700,
            color: winnerPlayerKey ? theme.color.success : theme.color.textMuted,
            background: winnerPlayerKey ? theme.color.successBg : theme.color.bg,
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {nominees.length}/{MAX_PLAYER_AWARD_NOMINEES}{winnerPlayerKey ? " · Winner set" : ""}
        </span>
      </div>

      {nominees.length < MAX_PLAYER_AWARD_NOMINEES && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            placeholder="Search player name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${theme.color.border}`, fontSize: 13 }}
          />
          {matches.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#fff",
                border: `1px solid ${theme.color.border}`,
                borderRadius: 10,
                boxShadow: "0 14px 30px -16px rgba(33,26,51,0.4)",
                overflow: "hidden",
                zIndex: 3,
              }}
            >
              {matches.map((p) => (
                <div
                  key={p.playerKey}
                  onClick={() => addNominee(p)}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", fontSize: 12.5, cursor: "pointer", borderBottom: `1px solid ${theme.color.border}` }}
                >
                  <PlayerPhoto name={p.name} selfieUrl={p.selfieUrl} size={22} />
                  {p.name}
                  <span style={{ marginLeft: "auto", color: theme.color.textMuted, fontSize: 11 }}>{p.teamName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {nominees.map((n) => {
          const isWinner = n.playerKey === winnerPlayerKey;
          const photo = roster.find((p) => p.playerKey === n.playerKey)?.selfieUrl;
          return (
            <div
              key={n.playerKey}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: isWinner ? "#FBF1D9" : theme.color.bg,
                border: `1.5px solid ${isWinner ? "#E9D094" : theme.color.border}`,
                borderRadius: 999,
                padding: "5px 6px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <PlayerPhoto name={n.name} selfieUrl={photo} size={24} />
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                {n.name}
                <span style={{ fontSize: 9.5, fontWeight: 600, color: theme.color.textMuted }}>{n.teamName}</span>
              </span>
              <button
                type="button"
                onClick={() => toggleWinner(n.playerKey)}
                title={isWinner ? "Winner — tap to unset" : "Mark as winner"}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: isWinner ? "#B4870F" : theme.color.textMuted, opacity: isWinner ? 1 : 0.5, padding: 0 }}
              >
                {isWinner ? "★" : "☆"}
              </button>
              <button
                type="button"
                onClick={() => removeNominee(n.playerKey)}
                title="Remove nominee"
                style={{ width: 16, height: 16, borderRadius: "50%", background: theme.color.border, color: theme.color.textMuted, fontSize: 9, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                ✕
              </button>
            </div>
          );
        })}
        {nominees.length === 0 && <span style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No nominees yet.</span>}
      </div>
    </Card>
  );
}

function PlayerPhoto({ name, selfieUrl, size }: { name: string; selfieUrl?: string; size: number }) {
  if (selfieUrl) {
    return <img src={selfieUrl} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: theme.color.purple,
        color: "#fff",
        fontSize: size * 0.4,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function TeamAwardRow({
  type,
  applicable,
  teams,
  games,
  categoryId,
  override,
  onOverride,
}: {
  type: TeamAwardType;
  applicable: boolean;
  teams: { id: string; name: string }[];
  games: Parameters<typeof resolveTeamAward>[0];
  categoryId: string;
  override?: TeamAwardOverride;
  onOverride: (o: TeamAwardOverride | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  if (!applicable) {
    return (
      <Row label={TEAM_AWARD_LABELS[type]} icon={TEAM_AWARD_ICONS[type]}>
        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: theme.color.textMuted, background: theme.color.bg, padding: "2px 8px", borderRadius: 999 }}>
          N/A — Men's Open only
        </span>
      </Row>
    );
  }

  const resolved = resolveTeamAward(games, categoryId, type, override);
  const teamName = resolved ? teams.find((t) => t.id === resolved.teamId)?.name ?? override?.teamName ?? "Unknown team" : undefined;

  return (
    <Row label={TEAM_AWARD_LABELS[type]} icon={TEAM_AWARD_ICONS[type]}>
      {teamName ? (
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700 }}>
          {teamName}
          {resolved?.overridden && <span style={{ fontSize: 9.5, fontWeight: 700, color: theme.color.warning, background: theme.color.warningBg, padding: "1px 6px", borderRadius: 999 }}>override</span>}
        </span>
      ) : (
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: theme.color.textMuted, fontStyle: "italic" }}>Not decided yet</span>
      )}
      <button
        type="button"
        onClick={() => setPicking((v) => !v)}
        style={{ marginLeft: 10, background: "none", border: "none", color: theme.color.purple, fontWeight: 700, fontSize: 11, cursor: "pointer", padding: 0 }}
      >
        {override ? "Clear override" : "Override"}
      </button>
      {picking && (
        <div style={{ position: "relative", marginLeft: 8 }}>
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) {
                onOverride(null);
              } else {
                const t = teams.find((x) => x.id === e.target.value);
                if (t) onOverride({ teamId: t.id, teamName: t.name });
              }
              setPicking(false);
            }}
            style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: `1px solid ${theme.color.border}` }}
          >
            <option value="" disabled>
              Pick a team…
            </option>
            {override && <option value="">— clear override —</option>}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </Row>
  );
}

function Row({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${theme.color.border}`, flexWrap: "wrap" }}>
      <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, width: 118, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}
