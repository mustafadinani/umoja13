import { useState } from "react";
import type { Sponsor } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Modal } from "./ui";

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const [open, setOpen] = useState<Sponsor | null>(null);
  if (sponsors.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: theme.color.textMuted, marginBottom: 10 }}>
        WITH THANKS TO OUR SPONSORS
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {sponsors.map((s) => (
          <div
            key={s.id}
            onClick={() => setOpen(s)}
            style={{ padding: "10px 16px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}
          >
            {s.name}
          </div>
        ))}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>{open.name}</div>
          <div style={{ fontSize: 13, color: theme.color.textMuted, margin: "4px 0 14px" }}>{open.tagline}</div>
          <div style={{ fontSize: 15, lineHeight: 1.6 }}>{open.story}</div>
        </Modal>
      )}
    </div>
  );
}
