import { useEffect, useMemo, useState } from "react";
import type { Pod } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllUsers, useGames, usePods } from "../../../hooks/useData";
import { deletePod, ensurePodsSeeded, updatePod } from "../../../lib/callables";
import { Card, Pill, PrimaryButton } from "../../../components/ui";
import { PodHubPanel } from "../../../components/PodHubPanel";
import { PodEditorModal } from "./PodEditorModal";

export function PodsAdminTab() {
  const { data: pods } = usePods();
  const { data: users } = useAllUsers();
  const { data: games } = useGames();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pod | null | "new">(null);

  useEffect(() => {
    ensurePodsSeeded();
  }, []);

  const sorted = useMemo(
    () => [...pods].sort((a, b) => (a.isGeneral ? -1 : b.isGeneral ? 1 : a.name.localeCompare(b.name))),
    [pods]
  );
  const selected = sorted.find((p) => p.id === selectedId) ?? null;

  const suggestions = useMemo(() => {
    if (!selected || selected.fields.length === 0) return [];
    const uids = new Set<string>();
    for (const g of games) {
      if (g.refereeUid && selected.fields.includes(g.field) && !selected.memberUids.includes(g.refereeUid)) {
        uids.add(g.refereeUid);
      }
    }
    return [...uids].map((uid) => users.find((u) => u.uid === uid)).filter((u): u is NonNullable<typeof u> => !!u);
  }, [selected, games, users]);

  async function addSuggested(uid: string) {
    if (!selected) return;
    await updatePod({ podId: selected.id, memberUids: [...selected.memberUids, uid] });
  }

  async function addAllSuggested() {
    if (!selected) return;
    await updatePod({ podId: selected.id, memberUids: [...selected.memberUids, ...suggestions.map((u) => u.uid)] });
  }

  async function remove(podId: string) {
    if (!confirm("Delete this pod? Its chat history goes with it.")) return;
    await deletePod({ podId });
    if (selectedId === podId) setSelectedId(null);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>PODS</div>
        <PrimaryButton onClick={() => setEditing("new")}>+ NEW POD</PrimaryButton>
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        A staffing zone — chat and shared task visibility for whoever's assigned to it. Everyone approved as admin, commissioner, referee, or volunteer starts in General until sorted into a zone.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {sorted.map((p) => (
          <Card
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              border: selectedId === p.id ? `1px solid ${theme.color.navy}` : `1px solid ${theme.color.border}`,
            }}
          >
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {p.name} {p.isGeneral && <span style={{ color: theme.color.textMuted, fontWeight: 600, fontSize: 12 }}>· default</span>}
              </div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>
                {p.fields.length > 0 ? p.fields.join(", ") : "No fields assigned"} · {p.memberUids.length} member{p.memberUids.length === 1 ? "" : "s"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(p); }}
                style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "6px 10px", fontSize: 12, fontWeight: 600 }}
              >
                Edit
              </button>
              {!p.isGeneral && (
                <button
                  onClick={(e) => { e.stopPropagation(); remove(p.id); }}
                  style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: theme.color.danger }}
                >
                  Delete
                </button>
              )}
            </div>
          </Card>
        ))}
        {sorted.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Setting up pods…</div>}
      </div>

      {selected && (
        <>
          {suggestions.length > 0 && (
            <Card style={{ background: theme.color.warningBg, border: "none", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {suggestions.length} referee{suggestions.length > 1 ? "s are" : " is"} scheduled on {selected.name}'s fields but not on the roster yet
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {suggestions.map((u) => (
                  <Pill key={u.uid} onClick={() => addSuggested(u.uid)}>+ {u.displayName}</Pill>
                ))}
              </div>
              <PrimaryButton onClick={addAllSuggested}>ADD ALL</PrimaryButton>
            </Card>
          )}

          <Card>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{selected.name}</div>
            <PodHubPanel podId={selected.id} canPost />
          </Card>
        </>
      )}

      {editing === "new" && <PodEditorModal onClose={() => setEditing(null)} />}
      {editing && editing !== "new" && <PodEditorModal pod={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
