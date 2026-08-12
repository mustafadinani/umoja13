import { useMemo, useState } from "react";
import { ROLES, formatKickoffTime, type Announcement, type Role } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAnnouncements, useGames, useTeams } from "../../../hooks/useData";
import {
  sendNotification,
  postAnnouncement as postAnnouncementCallable,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../../lib/callables";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { LinkifiedText } from "../../../components/LinkifiedText";

type TargetMode = "all" | "role" | "game";

const ROLE_LABELS: Record<Role, string> = {
  fan: "Fans",
  player: "Players",
  captain: "Captains",
  coach_manager: "Coaches/Managers",
  volunteer: "Volunteers",
  referee: "Referees",
  commissioner: "Commissioners",
  admin: "Admins",
};

export function NotificationsAdminTab() {
  const { data: games } = useGames();
  const { data: teams } = useTeams();
  const { data: announcements } = useAnnouncements();
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [role, setRole] = useState<Role>("player");
  const [gameId, setGameId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ notifiedCount: number; pushCount: number; emailCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [alsoNotify, setAlsoNotify] = useState(false);
  const [posting, setPosting] = useState(false);
  const [annResult, setAnnResult] = useState<{ notifiedCount: number; pushCount: number } | null>(null);
  const [annError, setAnnError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

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
    setBody(`${home} vs ${away} — ${g.day.toUpperCase()} ${formatKickoffTime(g.kickoffTime)} at ${g.field}. See you there!`);
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

  async function postAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) return;
    setPosting(true);
    setAnnError(null);
    setAnnResult(null);
    try {
      const res = await postAnnouncementCallable({ title: annTitle, body: annBody, alsoNotify });
      setAnnResult({ notifiedCount: res.data.notifiedCount, pushCount: res.data.pushCount });
      setAnnTitle("");
      setAnnBody("");
      setAlsoNotify(false);
    } catch (e) {
      setAnnError(e instanceof Error ? e.message : "Couldn't post this announcement.");
    } finally {
      setPosting(false);
    }
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditBody(a.body);
    setRowError(null);
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim() || !editBody.trim()) return;
    setRowBusyId(id);
    setRowError(null);
    try {
      await updateAnnouncement({ id, title: editTitle.trim(), body: editBody.trim() });
      setEditingId(null);
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Couldn't save changes.");
    } finally {
      setRowBusyId(null);
    }
  }

  async function removeAnnouncement(id: string) {
    if (!window.confirm("Delete this announcement? It will disappear from Home and everyone's inbox immediately.")) return;
    setRowBusyId(id);
    setRowError(null);
    try {
      await deleteAnnouncement({ id });
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Couldn't delete this announcement.");
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>SEND A TARGETED ALERT</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 10 }}>
        Use this to reach a specific role, or the two rosters + referee for one game. For a public bulletin everyone should see (including signed-out visitors on Home), post an announcement below instead.
      </div>
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
                  {teamById.get(g.homeTeamId)?.name ?? "TBD"} vs {teamById.get(g.awayTeamId)?.name ?? "TBD"} · {g.day.toUpperCase()} {formatKickoffTime(g.kickoffTime)}
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

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>POST AN ANNOUNCEMENT</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 10 }}>
        A public bulletin — shown on Home to everyone, including signed-out visitors — not just a personal notification.
      </div>
      <Card style={{ marginBottom: 20 }}>
        <input
          placeholder="Title"
          value={annTitle}
          onChange={(e) => setAnnTitle(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13.5 }}
        />
        <textarea
          placeholder="Body"
          value={annBody}
          onChange={(e) => setAnnBody(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5, resize: "none" }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={alsoNotify} onChange={(e) => setAlsoNotify(e.target.checked)} />
          Also send as a personal notification to everyone
        </label>
        {annError && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{annError}</div>}
        {annResult && (
          <div style={{ color: theme.color.success, fontSize: 13, marginBottom: 10 }}>
            Posted{annResult.notifiedCount > 0 ? ` and notified ${annResult.notifiedCount} ${annResult.notifiedCount === 1 ? "person" : "people"} (${annResult.pushCount} got a push)` : ""}.
          </div>
        )}
        <PrimaryButton disabled={posting || !annTitle.trim() || !annBody.trim()} onClick={postAnnouncement}>{posting ? "Posting…" : "POST"}</PrimaryButton>
      </Card>

      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>SENT ANNOUNCEMENTS</div>
      {rowError && <div style={{ color: theme.color.danger, fontSize: 13, marginBottom: 10 }}>{rowError}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {announcements.map((a) => {
          const editing = editingId === a.id;
          const busy = rowBusyId === a.id;
          return (
            <Card key={a.id} style={{ padding: "12px 16px" }}>
              {editing ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 8, fontSize: 13.5, fontWeight: 700 }}
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5, resize: "none" }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <PrimaryButton disabled={busy || !editTitle.trim() || !editBody.trim()} onClick={() => void saveEdit(a.id)} style={{ flex: 1 }}>
                      {busy ? "Saving…" : "SAVE"}
                    </PrimaryButton>
                    <button
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      style={{ flex: 1, background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, fontWeight: 700, cursor: "pointer" }}
                    >
                      CANCEL
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                    <LinkifiedText text={a.body} style={{ fontSize: 13, color: theme.color.text, marginTop: 4, lineHeight: 1.45, display: "block" }} />
                    <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 6 }}>
                      {a.postedByName ?? "Umoja"} · {new Date(a.postedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      disabled={busy}
                      onClick={() => startEdit(a)}
                      style={{ background: "#F1EFF5", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void removeAnnouncement(a.id)}
                      style={{ background: theme.color.dangerBg, color: theme.color.danger, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      {busy ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {announcements.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No announcements posted yet.</div>}
      </div>
    </div>
  );
}
