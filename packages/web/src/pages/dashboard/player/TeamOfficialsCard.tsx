import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { COLLECTIONS, MAX_TEAM_OFFICIALS, OFFICIAL_KIND_LABELS, type OfficialKind, type Team } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { assignTeamOfficial, getTeamOfficialNames, removeTeamOfficial } from "../../../lib/callables";
import { Card } from "../../../components/ui";

/**
 * The one place to add or remove a team official (captain or manager/coach)
 * — replaces the old per-roster-row "Make Captain" button (RosterPanel.tsx),
 * which duplicated this exact action once this card grew its own
 * roster-search add flow. Self-serve, available to any current official,
 * matching assignTeamOfficial's broadened permission check — not staff-only.
 */
export function TeamOfficialsCard({ team }: { team: Team }) {
  const [appointedPlayerKeys, setAppointedPlayerKeys] = useState<Set<string>>(new Set());
  const [managerNames, setManagerNames] = useState<Map<string, string>>(new Map());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OfficialKind>("captain");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.rosterCheckIns),
      where("teamId", "==", team.id),
      where("appointedCaptain", "==", true)
    );
    return onSnapshot(
      q,
      (snap) => setAppointedPlayerKeys(new Set(snap.docs.map((d) => d.data().userId as string))),
      () => setAppointedPlayerKeys(new Set())
    );
  }, [team.id]);

  const coachManagerUids = team.coachManagerUids ?? [];
  const coachManagerKey = coachManagerUids.join(",");
  useEffect(() => {
    if (coachManagerUids.length === 0) {
      setManagerNames(new Map());
      return;
    }
    let cancelled = false;
    getTeamOfficialNames({ teamId: team.id })
      .then((res) => {
        if (!cancelled) setManagerNames(new Map(res.data.members.map((m) => [m.uid, m.displayName])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, coachManagerKey]);

  // Real registration captain: has isCaptain but isn't in the appointed set —
  // that set is now known precisely from the rosterCheckIns query above, so
  // "isCaptain but not appointed" reliably means "the real one" by elimination.
  const realCaptain = team.roster.find((p) => p.isCaptain && !appointedPlayerKeys.has(p.playerKey ?? p.userId));
  const appointedCaptains = team.roster.filter((p) => p.isCaptain && appointedPlayerKeys.has(p.playerKey ?? p.userId));
  const totalCount = appointedCaptains.length + coachManagerUids.length;
  const atCap = totalCount >= MAX_TEAM_OFFICIALS;

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return team.roster.filter((p) => !p.isCaptain && p.displayName.toLowerCase().includes(q)).slice(0, 6);
  }, [search, team.roster]);

  async function addCaptain(playerKey: string, targetUid: string) {
    setBusyKey(playerKey);
    setError(null);
    try {
      await assignTeamOfficial({ teamId: team.id, kind: "captain", categoryId: team.categoryId, playerKey, targetUid });
      setSearch("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that captain.");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeCaptain(playerKey: string) {
    setBusyKey(playerKey);
    setError(null);
    try {
      await removeTeamOfficial({ teamId: team.id, kind: "captain", categoryId: team.categoryId, playerKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that captain.");
    } finally {
      setBusyKey(null);
    }
  }

  async function addManagerCoach() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusyKey("email");
    setError(null);
    try {
      await assignTeamOfficial({ teamId: team.id, kind: "manager_coach", email: trimmed });
      setEmail("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that manager/coach.");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeManagerCoach(uid: string) {
    setBusyKey(uid);
    setError(null);
    try {
      await removeTeamOfficial({ teamId: team.id, kind: "manager_coach", uid });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove that manager/coach.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>TEAM OFFICIALS</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: atCap ? theme.color.danger : theme.color.textMuted }}>
          {totalCount}/{MAX_TEAM_OFFICIALS}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {realCaptain && <OfficialRow kind="captain" name={realCaptain.displayName} sub="Registration captain" locked />}
        {appointedCaptains.map((p) => {
          const playerKey = p.playerKey ?? p.userId;
          return (
            <OfficialRow
              key={playerKey}
              kind="captain"
              name={p.displayName}
              busy={busyKey === playerKey}
              onRemove={() => removeCaptain(playerKey)}
            />
          );
        })}
        {coachManagerUids.map((uid) => (
          <OfficialRow
            key={uid}
            kind="manager_coach"
            name={managerNames.get(uid) ?? "…"}
            busy={busyKey === uid}
            onRemove={() => removeManagerCoach(uid)}
          />
        ))}
        {!realCaptain && appointedCaptains.length === 0 && coachManagerUids.length === 0 && (
          <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No officials on record for this team yet.</div>
        )}
      </div>

      {error && <div style={{ color: theme.color.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

      {!open ? (
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
      ) : (
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
                disabled={busyKey !== null}
                style={{ width: "100%", padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 8 }}
              />
              {matches.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {matches.map((p) => {
                    const playerKey = p.playerKey ?? p.userId;
                    return (
                      <button
                        key={playerKey}
                        disabled={busyKey !== null}
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
                  disabled={busyKey !== null}
                  style={{ flex: 1, minWidth: 180, padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                />
                <button
                  onClick={addManagerCoach}
                  disabled={busyKey !== null || !email.trim()}
                  style={{ background: theme.color.purple, color: "#fff", border: "none", borderRadius: theme.radius.sm, padding: "9px 14px", fontWeight: 700, fontSize: 13 }}
                >
                  {busyKey === "email" ? "Adding…" : "+ Add"}
                </button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function OfficialRow({
  kind,
  name,
  sub,
  locked,
  busy,
  onRemove,
}: {
  kind: OfficialKind;
  name: string;
  sub?: string;
  locked?: boolean;
  busy?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#F7F6F3", borderRadius: theme.radius.sm }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: 0.3,
          color: kind === "captain" ? theme.color.purple : theme.color.navy,
          border: `1px solid ${kind === "captain" ? theme.color.purple : theme.color.navy}`,
          borderRadius: 4,
          padding: "2px 6px",
          flexShrink: 0,
        }}
      >
        {OFFICIAL_KIND_LABELS[kind].toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{name}</div>
        {sub && <div style={{ fontSize: 12, color: theme.color.textMuted }}>{sub}</div>}
      </div>
      {locked ? (
        <span style={{ color: theme.color.textMuted, fontSize: 12, flexShrink: 0 }} title="Set by registration — not removable here">
          🔒
        </span>
      ) : (
        <button
          disabled={busy}
          onClick={onRemove}
          style={{ background: "none", border: "none", color: theme.color.danger, fontWeight: 700, fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}
        >
          {busy ? "…" : "Remove"}
        </button>
      )}
    </div>
  );
}
