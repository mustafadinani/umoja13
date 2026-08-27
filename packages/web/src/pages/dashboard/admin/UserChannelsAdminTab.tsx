import { useMemo, useState } from "react";
import { orderBy } from "firebase/firestore";
import {
  COLLECTIONS,
  SELF_REGISTERED_STATUS,
  INCOMPLETE_REGISTRATION_STATUS,
  categoryLabelFor,
  pickPrimaryRole,
  type RegisteredPlayer,
  type UserChannel,
  type UserProfile,
} from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useCollection } from "../../../hooks/firestore";
import { useAllUsers } from "../../../hooks/useData";
import { useRegisteredPlayers, useRegisteredTeamsRaw } from "../../../hooks/useRegistration";
import { ROLE_LABELS } from "../../../lib/roleLabels";
import { Card } from "../../../components/ui";
import { UserChannelPanel } from "../../../components/UserChannelPanel";

function isRealRegistration(p: RegisteredPlayer): boolean {
  return p.status !== SELF_REGISTERED_STATUS && p.status !== INCOMPLETE_REGISTRATION_STATUS;
}

/**
 * A real inbox: conversations on the left, the selected thread (with reply
 * box) on the right — instead of the old top-to-bottom stack where opening a
 * thread pushed it below every other conversation. Mirrors the sidebar+detail
 * pattern already used for Pods.
 */
export function UserChannelsAdminTab() {
  const { data: channels } = useCollection<UserChannel>(COLLECTIONS.userChannels, [orderBy("updatedAt", "desc")]);
  const { data: users } = useAllUsers();
  const { data: registeredTeams } = useRegisteredTeamsRaw();
  const { data: registeredPlayers } = useRegisteredPlayers();
  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const teamNameById = useMemo(() => new Map(registeredTeams.map((t) => [t.id, t.teamName?.trim() || "Untitled team"])), [registeredTeams]);
  // Captain's own registered name, keyed by their account uid — safe to use
  // as a conversation name (it's the account holder, not a shared family
  // account's child). Lets an old conversation whose stored authorName is
  // just an email-local-part fallback (e.g. someone signed up before
  // resolveAuthorName learned this fallback) still show a real name without
  // needing every historical message rewritten.
  const captainNameByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of registeredTeams) {
      if (t.uid && t.teamCaptainName?.trim()) map.set(t.uid, t.teamCaptainName.trim());
    }
    return map;
  }, [registeredTeams]);
  // Real registration rows (never self-registered/incomplete junk — see
  // registration.ts), grouped by account uid. Feeds both the sidebar's
  // one-word role (a registered uid with no staff/volunteer role otherwise
  // is a "Player" — see roleLabelFor) and the open thread's "Registered:"
  // line, which lists every one of them (an account can hold more than one
  // registration — siblings sharing a family account, most commonly).
  const registeredPlayersByUid = useMemo(() => {
    const map = new Map<string, RegisteredPlayer[]>();
    for (const p of registeredPlayers) {
      if (!p.uid || !isRealRegistration(p)) continue;
      if (!map.has(p.uid)) map.set(p.uid, []);
      map.get(p.uid)!.push(p);
    }
    return map;
  }, [registeredPlayers]);
  const [search, setSearch] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Guard against the rare users/{uid} doc missing displayName (see
  // setUserRole.ts) — an unguarded .toLowerCase() here used to throw and
  // take down this whole tab for every admin.
  const searchResults = search.trim()
    ? users.filter((u) => (u.displayName ?? "").toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  const selected = selectedUid ? userById.get(selectedUid) : undefined;
  const selectedChannel = channels.find((c) => c.id === selectedUid);

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MESSAGES</div>

      <div className="pods-layout">
        <div style={{ position: "sticky", top: 20 }}>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Find a user</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: searchResults.length > 0 ? 10 : 0 }}
            />
            {searchResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {searchResults.map((u) => (
                  <div
                    key={u.uid}
                    onClick={() => { setSelectedUid(u.uid); setSearch(""); }}
                    style={{ padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
                  >
                    {u.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {u.email}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div style={{ fontWeight: 700, fontSize: 13, margin: "4px 0 8px" }}>Conversations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "62vh", overflowY: "auto", paddingRight: 2 }}>
            {channels.map((c) => (
              <ConversationRow
                key={c.id}
                channel={c}
                profile={userById.get(c.id)}
                captainName={captainNameByUid.get(c.id)}
                roleLabel={roleLabelFor(userById.get(c.id), registeredPlayersByUid.has(c.id), captainNameByUid.has(c.id))}
                active={c.id === selectedUid}
                onSelect={() => setSelectedUid(c.id)}
              />
            ))}
            {channels.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5, padding: "8px 4px" }}>No conversations yet.</div>}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          {selectedUid ? (
            <Card>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {conversationName(selectedChannel, selectedUid, selected, captainNameByUid.get(selectedUid))}
                  {selected?.email && <span style={{ color: theme.color.textMuted, fontWeight: 400, fontSize: 12.5 }}> · {selected.email}</span>}
                </div>
                {(() => {
                  const summary = registrationSummary(registeredPlayersByUid.get(selectedUid), teamNameById);
                  return summary ? (
                    <div style={{ color: theme.color.purple, fontWeight: 600, fontSize: 12.5, marginTop: 3 }}>
                      Registered: {summary}
                    </div>
                  ) : null;
                })()}
              </div>
              <UserChannelPanel uid={selectedUid} />
            </Card>
          ) : (
            <Card style={{ color: theme.color.textMuted, fontSize: 13.5, textAlign: "center", padding: "40px 20px" }}>
              Select a conversation on the left, or search for a user above to start a new one.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One-word role for the conversation list — Player, Referee, Volunteer,
 * Fan, etc. — never the "who they've registered" detail (that only lives in
 * the open thread; see registrationSummary). Prefers the account's own
 * roles, topped up with "player" when real registration rows exist under
 * this uid even if the stored `roles` haven't caught up yet (the same gap
 * the useResolvedProfile fix closes for the account's own dashboard, just
 * applied here so the admin list is never stuck showing a role a fresh
 * signup started with before their family's registration was known).
 */
function roleLabelFor(profile: UserProfile | undefined, hasRegistration: boolean, isCaptain: boolean): string {
  const roles = profile?.roles ?? [];
  const effectiveRoles = hasRegistration && !roles.includes("player") ? [...roles, "player" as const] : roles;
  if (effectiveRoles.length > 0) return ROLE_LABELS[pickPrimaryRole(effectiveRoles)];
  if (isCaptain) return ROLE_LABELS.captain;
  if (hasRegistration) return ROLE_LABELS.player;
  return "—";
}

/**
 * "Amir Martin (Coastal FC · Boy's 10 & Under), ..." — every real
 * registration row under this uid, never assuming the account holder's
 * relationship to them (parent, coach, whoever registered them — we don't
 * actually know, so this never says "parent of").
 */
function registrationSummary(
  players: RegisteredPlayer[] | undefined,
  teamNameById: Map<string, string>
): string | null {
  if (!players || players.length === 0) return null;
  return players
    .map((p) => {
      const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unnamed player";
      const team = p.teamId?.trim() ? teamNameById.get(p.teamId.trim()) ?? p.teamName?.trim() : undefined;
      const category = p.categoryId ? categoryLabelFor(p.categoryId) : p.category?.trim();
      const meta = [team, category].filter(Boolean).join(" · ");
      return meta ? `${name} (${meta})` : name;
    })
    .join(", ");
}

/**
 * The `users/{uid}` profile doc is missing for anyone who registered through
 * Outreach but never went through the app's own sign-up flow — falling back
 * straight to the raw doc id there used to surface things like "_wy5wdabb8"
 * in the inbox. `captainName` (this uid's registered team-captain name, when
 * it is one) is checked next, ahead of the stored `authorName` — that field
 * is baked in at send time, so an old conversation sent before
 * resolveAuthorName learned to check the captain registration would
 * otherwise be stuck showing whatever it fell back to then (often the
 * email's local part, e.g. "sakinahkarim.nba"), even after the account gets
 * a real captain record. Every message already carries a properly resolved
 * `authorName` (Outreach profile -> team captain -> Auth displayName ->
 * email) for anyone NOT a captain, so that's the last resort before the raw
 * uid.
 */
function conversationName(channel: UserChannel | undefined, uid: string, profile?: UserProfile, captainName?: string): string {
  if (profile?.displayName?.trim()) return profile.displayName.trim();
  if (captainName?.trim()) return captainName.trim();
  const lastUserMessage = [...(channel?.messages ?? [])].reverse().find((m) => m.from === "user");
  if (lastUserMessage?.authorName?.trim() && lastUserMessage.authorName !== "Someone") return lastUserMessage.authorName.trim();
  return uid;
}

function ConversationRow({
  channel,
  profile,
  captainName,
  roleLabel,
  active,
  onSelect,
}: {
  channel: UserChannel;
  profile?: UserProfile;
  captainName?: string;
  roleLabel: string;
  active: boolean;
  onSelect: () => void;
}) {
  const sorted = [...channel.messages].sort((a, b) => a.createdAt - b.createdAt);
  const last = sorted[sorted.length - 1];
  // A real "awaiting a human" signal: the AI answers every non-escalated
  // message immediately, so the thread only ends on a bare user turn when
  // either they've asked to talk to an organizer, or the bot failed to
  // reply — both cases actually need staff attention. A long AI
  // back-and-forth (thread ending on an "ai" turn) never counts.
  const awaitingOrganizer = last?.from === "user";

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "10px 12px",
        borderRadius: theme.radius.sm,
        border: `1px solid ${active ? theme.color.purple : theme.color.border}`,
        background: active ? "#F1EFF5" : "#fff",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conversationName(channel, channel.id, profile, captainName)}
          </div>
          {awaitingOrganizer && (
            <span style={{ fontSize: 10, fontWeight: 800, color: theme.color.pink, background: "#FBE3EA", borderRadius: 999, padding: "2px 7px", flexShrink: 0 }}>
              WAITING
            </span>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: theme.color.textMuted, flexShrink: 0 }}>{new Date(channel.updatedAt).toLocaleDateString()}</div>
      </div>
      <div style={{ fontSize: 11, color: theme.color.textMuted, fontWeight: 600, letterSpacing: "0.02em", marginTop: 3 }}>
        {roleLabel}
      </div>
      {last && (
        <div style={{ fontSize: 11.5, color: theme.color.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {last.from === "ai" ? `🤖 ${last.text}` : last.text}
        </div>
      )}
    </div>
  );
}
