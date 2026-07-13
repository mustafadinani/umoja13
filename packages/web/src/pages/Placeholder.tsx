import { theme } from "../lib/theme";

export function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32 }}>{title}</div>
      <div style={{ color: theme.color.textMuted, marginTop: 8 }}>Coming soon — under active construction.</div>
    </div>
  );
}
