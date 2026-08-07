import { useState } from "react";
import { theme } from "../lib/theme";
import { colorForSeed } from "../lib/podColors";
import { useAuth } from "../auth/AuthProvider";
import { useMyPods } from "../hooks/useData";
import { PodHubPanel } from "./PodHubPanel";

/**
 * A pod-eligible user's own pods, Slack-channel style: a vertical list of
 * pods on the left, the selected pod's chat/shifts/tasks on the right — so
 * which pod you're looking at is always obvious, and switching is one click.
 */
export function MyPodsPanel() {
  const { user } = useAuth();
  const { data: pods } = useMyPods(user?.uid);
  const sorted = [...pods].sort((a, b) => (a.isGeneral ? 1 : b.isGeneral ? -1 : a.name.localeCompare(b.name)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0] ?? null;

  if (sorted.length === 0) {
    return <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>Not on a pod yet.</div>;
  }

  return (
    <div className="pods-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ color: theme.color.textMuted, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 6, paddingLeft: 10 }}>
          PODS
        </div>
        {sorted.map((p) => {
          const active = selected?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
                padding: "9px 10px",
                borderRadius: theme.radius.sm,
                border: "none",
                background: active ? theme.color.navy : "transparent",
                color: active ? "#fff" : theme.color.text,
                fontSize: 13.5,
                fontWeight: active ? 700 : 600,
                cursor: "pointer",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colorForSeed(p.id), flexShrink: 0 }} />
              {p.name}
            </button>
          );
        })}
      </div>

      <div style={{ minWidth: 0 }}>
        {selected && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 28 }}>{selected.name}</div>
            <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
              {selected.memberUids.length} member{selected.memberUids.length === 1 ? "" : "s"}
            </div>
          </div>
        )}
        {selected && <PodHubPanel podId={selected.id} canPost />}
      </div>
    </div>
  );
}
