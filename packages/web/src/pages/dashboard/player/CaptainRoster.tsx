import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  checkInStatusLabel,
  checkInStatusTone,
  COLLECTIONS,
  MAX_TEAM_OFFICIALS,
  OFFICIAL_KIND_LABELS,
  TOURNAMENT_START_AT,
  type OfficialKind,
  type Team,
} from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { assignTeamOfficial, removeTeamOfficial, setJerseyNumber } from "../../../lib/callables";
import { Card } from "../../../components/ui";

const tournamentStarted = Date.now() >= TOURNAMENT_START_AT;

/**
 * `canAppointCaptain` is true only when this render is a coach/manager's own
 * "TEAM OFFICIAL TOOLS" view of a team they don't play on themselves (see
 * PlayerDashboard.tsx) — a real captain viewing their own roster never gets
 * this per-row action, matching the literal ask ("the coach should also be
 * able to mark someone as captain"). The "add an official" panel below is
 * separate and available to anyone rendering this component at all, since
 * PlayerDashboard only ever renders it for someone who's already a team
 * official themselves (real captain, appointed co-captain, or coach/manager)
 * — see assignTeamOfficial's self-serve permission check.
 */
export function CaptainRoster({ team, canAppointCaptain }: { team: Team; canAppointCaptain?: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captainBusyKey, setCaptainBusyKey] = useState<string | null>(null);
  const clearedCount = team.roster.filter((p) => p.checkInStatus === "approved").length;

  async function saveNumber(playerKey: string) {
    const num = Number(draft);
    if (!draft || Number.isNaN(num) || num < 0 || num > 999) return setError("Enter a valid number (0–999).");
    setSaving(true);
    setError(null);
    try {
      await setJerseyNumber({ teamId: team.id, playerKey, categoryId: team.categoryId, jerseyNumber: num });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that number.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCaptain(playerKey: string, targetUid: string, makeCaptain: boolean) {
    setCaptainBusyKey(playerKey);
    setError(null);
    try {
      if (makeCaptain) {
        await assignTeamOfficial({ teamId: team.id, kind: "captain", categoryId: team.categoryId, playerKey, targetUid });
      } else {
        await removeTeamOfficial({ teamId: team.id, kind: "captain", categoryId: team.categoryId, playerKey });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update captain status.");
    } finally {
      setCaptainBusyKey(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>CHECK-IN TRACKER</div>
        <div style={{ fontSize: 13, color: theme.color.textMuted }}>{clearedCount}/{team.roster.length} verified</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {team.roster.map((p) => {
          const locked = tournamentStarted;
          const playerKey = p.playerKey ?? p.userId;
          return (
            <Card key={playerKey} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {editing === playerKey ? (
                <>
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                    style={{ width: 50, padding: 6, borderRadius: 6, border: `1px solid ${theme.color.border}` }}
                  />
                  <button
                    disabled={saving}
                    onClick={() => saveNumber(playerKey)}
                    style={{ background: theme.color.navy, color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => { setEditing(null); setError(null); }} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12 }}>
                    Cancel
                  </button>
                </>
              ) : p.jerseyNumber !== undefined ? (
                <span
                  onClick={() => {
                    if (locked) return;
                    setEditing(playerKey);
                    setDraft(String(p.jerseyNumber ?? ""));
                    setError(null);
                  }}
                  title={locked ? "Locked for the rest of the tournament" : "Tap to edit"}
                  style={{
                    fontFamily: theme.font.display,
                    fontWeight: 800,
                    fontSize: 15,
                    color: locked ? theme.color.textMuted : theme.color.purple,
                    cursor: locked ? "default" : "pointer",
                    width: 34,
                  }}
                >
                  #{p.jerseyNumber}{locked && " 🔒"}
                </span>
              ) : (
                <button
                  onClick={() => {
                    if (locked) return;
                    setEditing(playerKey);
                    setDraft("");
                    setError(null);
                  }}
                  disabled={locked}
                  title={locked ? "Locked for the rest of the tournament" : "Tap to add a jersey number"}
                  style={{
                    fontFamily: theme.font.display,
                    fontWeight: 800,
                    fontSize: 11.5,
                    color: locked ? theme.color.textMuted : theme.color.purple,
                    background: "none",
                    border: `1.5px dashed ${locked ? theme.color.border : theme.color.purple}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: locked ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {locked ? "🔒 #—" : "+ Add #"}
                </button>
              )}
              <span style={{ flex: 1, minWidth: 120, fontWeight: 600, fontSize: 14 }}>
                {p.displayName}{p.isCaptain ? " (C)" : ""}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: { success: theme.color.success, warning: theme.color.warning, muted: theme.color.textMuted, danger: theme.color.danger }[checkInStatusTone(p.checkInStatus)],
                }}
              >
                {checkInStatusLabel(p.checkInStatus)}
              </span>
              {canAppointCaptain && (
                <button
                  disabled={captainBusyKey === playerKey}
                  onClick={() => toggleCaptain(playerKey, p.userId, !p.isCaptain)}
                  style={{
                    background: p.isCaptain ? "none" : theme.color.purple,
                    color: p.isCaptain ? theme.color.textMuted : "#fff",
                    border: p.isCaptain ? `1px solid ${theme.color.border}` : "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {captainBusyKey === playerKey ? "…" : p.isCaptain ? "Remove Captain" : "Make Captain"}
                </button>
              )}
            </Card>
          );
        })}
      </div>
      {error && <div style={{ color: theme.color.danger, fontSize: 12.5, marginTop: -12, marginBottom: 12 }}>{error}</div>}
      {tournamentStarted && (
        <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: -12, marginBottom: 12 }}>
          🔒 Jersey numbers are locked now that the tournament has started.
        </div>
      )}

      <AddTeamOfficialPanel team={team} />
    </div>
  );
}

/**
 * Self-serve version of the same add-official flow TeamsAdminTab.tsx offers
 * staff — any current official (real captain, appointed co-captain, or
 * coach/manager) can add up to MAX_TEAM_OFFICIALS more, enforced server-side
 * in assignTeamOfficial. Doesn't try to list the OTHER officials by name —
 * unlike the roster above, a coach/manager isn't necessarily on this roster,
 * and resolving arbitrary users' display names isn't something a captain's
 * own Firestore access is meant to allow (that's the admin tab's job). Just
 * shows the count against the cap, which is safe to compute from data this
 * view already has access to.
 */
function AddTeamOfficialPanel({ team }: { team: Team }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OfficialKind>("captain");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointedCount, setAppointedCount] = useState<number | null>(null);
  const [coachManagerCount, setCoachManagerCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.rosterCheckIns),
      where("teamId", "==", team.id),
      where("appointedCaptain", "==", true)
    );
    return onSnapshot(
      q,
      (snap) => setAppointedCount(new Set(snap.docs.map((d) => d.data().userId)).size),
      () => setAppointedCount(null)
    );
  }, [team.id]);

  useEffect(() => {
    setCoachManagerCount(team.coachManagerUids?.length ?? 0);
  }, [team.coachManagerUids]);

  const totalCount = (appointedCount ?? 0) + coachManagerCount;
  const atCap = totalCount >= MAX_TEAM_OFFICIALS;

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return team.roster.filter((p) => !p.isCaptain && p.displayName.toLowerCase().includes(q)).slice(0, 6);
  }, [search, team.roster]);

  async function addCaptain(playerKey: string, targetUid: string) {
    setBusy(true);
    setError(null);
    try {
      await assignTeamOfficial({ teamId: team.id, kind: "captain", categoryId: team.categoryId, playerKey, targetUid });
      setSearch("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that captain.");
    } finally {
      setBusy(false);
    }
  }

  async function addManagerCoach() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await assignTeamOfficial({ teamId: team.id, kind: "manager_coach", email: trimmed });
      setEmail("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that manager/coach.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={atCap}
        style={{
          background: "none",
          border: `1.5px dashed ${atCap ? theme.color.border : theme.color.purple}`,
          borderRadius: theme.radius.sm,
          color: atCap ? theme.color.textMuted : theme.color.purple,
          fontWeight: 700,
          fontSize: 13,
          padding: "10px 14px",
          cursor: atCap ? "default" : "pointer",
          width: "100%",
        }}
      >
        {atCap ? `Team officials full (${MAX_TEAM_OFFICIALS}/${MAX_TEAM_OFFICIALS})` : `+ Add a team official (${totalCount}/${MAX_TEAM_OFFICIALS})`}
      </button>
    );
  }

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>Add a team official</div>
        <button onClick={() => { setOpen(false); setError(null); }} style={{ background: "none", border: "none", color: theme.color.textMuted, fontSize: 12 }}>
          Cancel
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["captain", "manager_coach"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: theme.radius.sm,
              border: `1px solid ${kind === k ? theme.color.purple : theme.color.border}`,
              background: kind === k ? theme.color.purple : "none",
              color: kind === k ? "#fff" : theme.color.text,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {OFFICIAL_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {kind === "captain" ? (
        <>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 8 }}>
            Search this team's roster for who to appoint.
          </div>
          <input
            placeholder="Search roster by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={busy}
            style={{ width: "100%", padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 8 }}
          />
          {matches.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {matches.map((p) => {
                const playerKey = p.playerKey ?? p.userId;
                return (
                  <button
                    key={playerKey}
                    disabled={busy}
                    onClick={() => addCaptain(playerKey, p.userId)}
                    style={{ textAlign: "left", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, background: "#F7F6F3", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    {p.displayName}
                  </button>
                );
              })}
            </div>
          )}
          {search.trim() && matches.length === 0 && (
            <div style={{ fontSize: 12.5, color: theme.color.textMuted }}>No match on this roster.</div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 8 }}>
            They need to have signed into the app at least once already.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder="Email address…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              style={{ flex: 1, minWidth: 180, padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
            />
            <button
              onClick={addManagerCoach}
              disabled={busy || !email.trim()}
              style={{ background: theme.color.purple, color: "#fff", border: "none", borderRadius: theme.radius.sm, padding: "9px 14px", fontWeight: 700, fontSize: 13 }}
            >
              {busy ? "Adding…" : "+ Add"}
            </button>
          </div>
        </>
      )}
      {error && <div style={{ color: theme.color.danger, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
    </Card>
  );
}
