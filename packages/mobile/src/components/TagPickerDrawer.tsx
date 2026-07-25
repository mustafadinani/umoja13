import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { theme } from "../lib/theme";
import { Drawer, PrimaryButton } from "./ui";

export interface TagPickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

export function TagPickerDrawer({
  title,
  items,
  selected,
  onConfirm,
  onClose,
}: {
  title: string;
  items: TagPickerItem[];
  selected: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [working, setWorking] = useState<string[]>(selected);
  const [search, setSearch] = useState("");

  const filtered = items.filter((i) => (i.label + " " + (i.sublabel ?? "")).toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) {
    setWorking((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Drawer visible onClose={onClose}>
      <Text style={styles.title}>{title}</Text>

      <TextInput value={search} onChangeText={setSearch} placeholder="Search…" style={styles.search} />
      <Text style={styles.count}>{working.length} selected</Text>

      <View style={{ marginBottom: 20 }}>
        {filtered.map((item) => {
          const active = working.includes(item.id);
          return (
            <TouchableOpacity key={item.id} onPress={() => toggle(item.id)} style={[styles.row, active && styles.rowActive]}>
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✓</Text>}
              </View>
              <View>
                <Text style={{ fontWeight: "600", fontSize: 13.5 }}>{item.label}</Text>
                {item.sublabel && <Text style={{ fontSize: 11.5, color: theme.color.textMuted }}>{item.sublabel}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 && <Text style={{ color: theme.color.textMuted, fontSize: 13, padding: 8 }}>No matches.</Text>}
      </View>

      <PrimaryButton onPress={() => onConfirm(working)} style={{ width: "100%" }}>
        DONE {working.length > 0 ? `(${working.length})` : ""}
      </PrimaryButton>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", fontSize: 19, marginBottom: 12 },
  search: { borderWidth: 1, borderColor: theme.color.border, borderRadius: 8, padding: 10, fontSize: 13.5, marginBottom: 6 },
  count: { fontSize: 12, color: theme.color.textMuted, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8 },
  rowActive: { backgroundColor: "#F7F0FF" },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: theme.color.border, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: theme.color.purple, borderColor: theme.color.purple },
});
