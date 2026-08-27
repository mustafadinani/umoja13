import { useEffect, useMemo, useState } from "react";
import { isPodOpen, type Pod } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { colorForSeed } from "../../../lib/podColors";
import { useAllUsers, usePodChannelsFor, usePods } from "../../../hooks/useData";
import { useAuth } from "../../../auth/AuthProvider";
import { deletePod, ensurePodsSeeded } from "../../../lib/callables";
import { AvatarStack } from "../../../components/ui";
import { PodHubPanel } from "../../../components/PodHubPanel";
import { PodEditorModal } from "./PodEditorModal";

/**
 * Pods on the left (like a channel list), the selected pod's whole world —
 * chat/shifts/tasks, plus who's on it — on the right. Replaced the old
 * top-to-bottom stack of pod cards, which meant scrolling past every other
 * pod to find the one you actually wanted.
 */
export function PodsAdminTab() {
  const { user } = useAuth();
  const { data: pods } = usePods();
  const { data: users } = useAllUsers();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pod | null | "new">(null);

  useEffect(() => {
    ensurePodsSeeded();
  }, []);

  const nameByUid = useMemo(() => new Map(users.map((u) => [u.uid, u.displayName])), [users]);

  const sorted = useMemo(
    () => [...pods].sort((a, b) => (a.isGeneral ? -1 : b.isGeneral ? 1 : a.name.localeCompare(b.name))),
    [pods]
  );
  const term = search.trim().toLowerCase();
  const visible = sorted.filter((p) => p.name.toLowerCase().includes(term));
  const selected = sorted.find((p) => p.id === selectedId) ?? null;

  // One batched query for every pod's unread state instead of a listener per
  // sidebar row — the sidebar can list every pod at once, and each row
  // opening its own onSnapshot doesn't scale past a handful of pods.
  const { data: channels } = usePodChannelsFor(sorted.map((p) => p.id));
  const unreadPodIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of channels) {
      const lastRead = user ? c.lastReadBy?.[user.uid] ?? 0 : 0;
      if (c.messages.some((m) => m.createdAt > lastRead && m.authorUid !== user?.uid)) set.add(c.podId);
    }
    return set;
  }, [channels, user]);

  async function remove(podId: string) {
    if (!confirm("Delete this pod? Its chat history goes with it.")) return;
    await deletePod({ podId });
    if (selectedId === podId) setSelectedId(null);
  }

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>PODS</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16, maxWidth: 640 }}>
        A staffing zone — chat and shared task visibility for whoever's assigned to it. Everyone approved as admin, commissioner, referee, or volunteer starts in General until sorted into a zone.
      </div>

      <div className="pods-layout">
        <div style={{ position: "sticky", top: 20 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a pod…"
            style={{ width: "100%", padding: "9px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto", paddingRight: 2 }}>
            {visible.map((p) => (
              <PodRow
                key={p.id}
                pod={p}
                color={colorForSeed(p.id)}
                active={p.id === selectedId}
                memberNames={p.memberUids.map((uid) => nameByUid.get(uid) ?? uid)}
                unread={unreadPodIds.has(p.id)}
                onSelect={() => setSelectedId(p.id)}
              />
            ))}
            {visible.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5, padding: "8px 4px" }}>No pods match "{search}".</div>}
          </div>
          <button
            onClick={() => setEditing("new")}
            style={{
              marginTop: 8, width: "100%", padding: 10, borderRadius: theme.radius.sm,
              border: `1.5px dashed ${theme.color.purple}`, background: "none", color: theme.color.purple,
              fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            }}
          >
            + ADD POD
          </button>
        </div>

        <div style={{ minWidth: 0 }}>
          {selected ? (
            <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12, background: colorForSeed(selected.id),
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0,
                    }}
                  >
                    {selected.isGeneral ? "🌐" : "📍"}
                  </div>
                  <div>
                    <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20 }}>{selected.name}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                      {selected.fields.length > 0 ? (
                        selected.fields.map((f) => (
                          <span key={f} style={{ fontSize: 10.5, fontWeight: 700, color: theme.color.textMuted, background: theme.color.bg, borderRadius: 999, padding: "2px 8px" }}>
                            {f}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: theme.color.textMuted, background: theme.color.bg, borderRadius: 999, padding: "2px 8px" }}>
                          No fields assigned
                        </span>
                      )}
                      {!selected.isGeneral && (
                        <span
                          style={{
                            fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "2px 8px",
                            color: isPodOpen(selected) ? theme.color.success : theme.color.textMuted,
                            background: isPodOpen(selected) ? theme.color.successBg : theme.color.bg,
                          }}
                        >
                          {isPodOpen(selected) ? "🌐 Open" : "🔒 Closed"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setEditing(selected)}
                    style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: 9, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: theme.color.textMuted, cursor: "pointer" }}
                  >
                    ✎ Edit
                  </button>
                  {!selected.isGeneral && (
                    <button
                      onClick={() => remove(selected.id)}
                      style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: 9, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: theme.color.danger, cursor: "pointer" }}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <PodHubPanel podId={selected.id} canPost />
              </div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: 40, textAlign: "center", color: theme.color.textMuted, fontSize: 13.5 }}>
              👈 Pick a pod on the left to see its chat, shifts, and tasks.
            </div>
          )}
        </div>
      </div>

      {editing === "new" && <PodEditorModal onClose={() => setEditing(null)} />}
      {editing && editing !== "new" && <PodEditorModal pod={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PodRow({
  pod, color, active, memberNames, unread, onSelect,
}: { pod: Pod; color: string; active: boolean; memberNames: string[]; unread: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 12,
        border: `1px solid ${active ? theme.color.purple : "transparent"}`,
        background: active ? "#F6EEFC" : "transparent",
        width: "100%", textAlign: "left", cursor: "pointer",
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
        {pod.isGeneral ? "🌐" : "📍"}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: active ? theme.color.purple : theme.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pod.name} {pod.isGeneral && <span style={{ color: theme.color.textMuted, fontWeight: 600, fontSize: 11 }}>· default</span>}
        </div>
        <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <AvatarStack names={memberNames} size={18} max={3} colorFor={colorForSeed} />
          <span>· {memberNames.length} {memberNames.length === 1 ? "person" : "people"}</span>
        </div>
      </div>
      {unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.color.pink, flexShrink: 0 }} />}
    </button>
  );
}
