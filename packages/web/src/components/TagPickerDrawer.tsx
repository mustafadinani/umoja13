import { useState } from "react";
import { theme } from "../lib/theme";
import { Drawer, Pill, PrimaryButton } from "./ui";

export interface TagPickerItem {
  id: string;
  label: string;
  sublabel?: string;
  /** Optional group (e.g. tournament category) this item belongs to, for the quick-filter chips. */
  groupId?: string;
}

export interface TagPickerGroup {
  id: string;
  label: string;
}

export function TagPickerDrawer({
  title,
  items,
  groups,
  selected,
  onConfirm,
  onClose,
}: {
  title: string;
  items: TagPickerItem[];
  /** When provided, renders "All" + one quick-filter chip per group above the list. */
  groups?: TagPickerGroup[];
  selected: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [working, setWorking] = useState<string[]>(selected);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string | "all">("all");

  const filtered = items
    .filter((i) => (i.label + " " + (i.sublabel ?? "")).toLowerCase().includes(search.toLowerCase()))
    .filter((i) => group === "all" || i.groupId === group);

  function toggle(id: string) {
    setWorking((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Drawer
      onClose={onClose}
      footer={
        <PrimaryButton onClick={() => onConfirm(working)} style={{ width: "100%" }}>
          DONE {working.length > 0 ? `(${working.length})` : ""}
        </PrimaryButton>
      }
    >
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 12 }}>{title}</div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        autoFocus
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, marginBottom: 10, fontSize: 13.5 }}
      />

      {groups && groups.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <Pill active={group === "all"} onClick={() => setGroup("all")}>All</Pill>
          {groups.map((g) => (
            <Pill key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>{g.label}</Pill>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 12 }}>{working.length} selected</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map((item) => {
          const active = working.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: theme.radius.sm,
                background: active ? "#F7F0FF" : "transparent",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: `2px solid ${active ? theme.color.purple : theme.color.border}`,
                  background: active ? theme.color.purple : "transparent",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {active && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.label}</div>
                {item.sublabel && <div style={{ fontSize: 11.5, color: theme.color.textMuted }}>{item.sublabel}</div>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13, padding: "8px 10px" }}>No matches.</div>}
      </div>
    </Drawer>
  );
}
