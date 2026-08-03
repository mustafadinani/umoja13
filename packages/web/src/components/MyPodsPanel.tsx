import { useState } from "react";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useMyPods } from "../hooks/useData";
import { Pill } from "./ui";
import { PodHubPanel } from "./PodHubPanel";

/**
 * A pod-eligible user's own pods. The whole point of this page is answering
 * "which pod(s) am I actually on?" — so the selected pod's real name is the
 * page's headline, not a generic "My Pods" label, and a switcher only shows
 * up when there's an actual choice to make.
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
    <div>
      <div style={{ color: theme.color.textMuted, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 4 }}>
        {sorted.length > 1 ? `YOU'RE ON ${sorted.length} PODS` : "YOU'RE ON"}
      </div>
      {selected && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: sorted.length > 1 ? 14 : 20, flexWrap: "wrap" }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32 }}>{selected.name}</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
            {selected.memberUids.length} member{selected.memberUids.length === 1 ? "" : "s"}
          </div>
        </div>
      )}
      {sorted.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {sorted.map((p) => (
            <Pill key={p.id} active={selected?.id === p.id} onClick={() => setSelectedId(p.id)}>{p.name}</Pill>
          ))}
        </div>
      )}
      {selected && <PodHubPanel podId={selected.id} canPost />}
    </div>
  );
}
