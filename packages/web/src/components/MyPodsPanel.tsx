import { useState } from "react";
import { theme } from "../lib/theme";
import { useAuth } from "../auth/AuthProvider";
import { useMyPods } from "../hooks/useData";
import { Pill } from "./ui";
import { PodHubPanel } from "./PodHubPanel";

/** A pod-eligible user's own pods — a switcher when they're in more than one, defaulting to the first non-General pod so the zone-specific chat isn't buried behind the catch-all. */
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
      {sorted.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {sorted.map((p) => (
            <Pill key={p.id} active={selected?.id === p.id} onClick={() => setSelectedId(p.id)}>{p.name}</Pill>
          ))}
        </div>
      )}
      {selected && <PodHubPanel podId={selected.id} canPost />}
    </div>
  );
}
