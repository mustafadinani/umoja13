import { useMemo, useState } from "react";
import { ROLES, type Role } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useGames, useTeams } from "../../../hooks/useData";
import { sendNotification } from "../../../lib/callables";
import { Card, Pill, PrimaryButton } from "../../../components/ui";

type TargetMode = "all" | "role" | "game";

const ROLE_LABELS: Record<Role, string> = {
  fan: "Fans",
  player: "Players",
  captain: "Captains",
  volunteer: "Volunteers",
  referee: "Referees",
  commissioner: "Commissioners",
  admin: "Admins",
};

export function NotificationsAdminTab() {
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [role, setRole] = useState<Role>("player");
  const [gameId, setGameId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ notifiedCount: number; pushCount: number; emailCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upcomingGames = [...games]
    .filter((g) => g.status !== "final")
    .sort((a, b) => (a.day + a.kickoffTime).localeCompare(b.day + b.kickoffTime));

  function fillGameReminder(id: string) {
    setGameId(id);
    const g = games.find((game) => game.id === id);
    if (!g) return;
    const home = teamById.get(g.homeTeamId)?.name ?? "TBD";
    const away = teamById.get(g.awayTeamId)?.name ?? "TBD";
    setTitle("Game reminder");
    setBody(`${home} vs ${away} — ${g.day.toUpperCase()} ${g.kickoffTime} at ${g.field}. See you there!`);
  }

  async function send() {
    if (!title.trim() || !body.trim()) return;
    if (targetMode === "game" && !gameId) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const target =
        targetMode === "all"
          ? { type: "all" as const }
          : targetMode === "role"
          ? { type: "role" as const, role }
          : { type: "game" as const, gameId: gameId! };
      const res = await sendNotification({ title, body, target });
      setResult(res.data);
      setTitle("");
      setBody("");
      setGameId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send this notification.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>SEND A NOTIFICATION</div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Send to</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <Pill active={targetMode === "all"} onClick={() => setTargetMode("all")}>Everyone</Pill>
          <Pill active={targetMode === "role"} onClick={() => setTargetMode("role")}>By role</Pill>
          <Pill active={targetMode === "game"} onClick={() => setTargetMode("game")}>Game reminder</Pill>
        </div>

        {targetMode === "role" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {ROLES.map((r) => (
              <Pill key={r} active={role === r} onClick={() => setRole(r)}>{ROLE_LABELS[r]}</Pill>
            ))}
          </div>
        )}

        {targetMode === "game" && (
          <div style={{ marginBottom: 14 }}>
            <select
              value={gameId ?? ""}
              onChange={(e) => fillGameReminder(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
            >
              <option value="" disabled>Pick a game…</option>
              {upcomingGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {teamById.get(g.homeTeamId)?.name ?? "TBD"} vs {teamById.get(g.awayTeamId)?.name ?? "TBD"} · {g.day.toUpperCase()} {g.kickoffTime}
                </option>
              ))}
            </select>
            <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 6 }}>
              Sends to both rosters and the assigned referee.
            </div>
          </div>
        )}

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13.5 }}
        />
        <textarea
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5, resize: "none" }}
        />

        {error && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {result && (
          <div style={{ color: theme.color.success, fontSize: 13, marginBottom: 10 }}>
            Sent to {result.notifiedCount} {result.notifiedCount === 1 ? "person" : "people"} ({result.pushCount} got a push,{" "}
            {result.emailCount} got an email).
          </div>
        )}

        <PrimaryButton
          disabled={sending || !title.trim() || !body.trim() || (targetMode === "game" && !gameId)}
          onClick={send}
        >
          {sending ? "Sending…" : "SEND"}
        </PrimaryButton>
      </Card>
    </div>
  );
}
