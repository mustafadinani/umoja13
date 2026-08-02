import { UMOJA_FAQ, THINGS_TO_DO, VENUE_LOGISTICS, VENUE, SPECIAL_EVENTS } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Card } from "../components/ui";

export function Info() {
  return (
    <div className="page-shell-sm" style={{ maxWidth: 780 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>EVENT INFO</div>
      <p style={{ color: theme.color.textMuted, fontSize: 14.5, margin: "0 0 28px" }}>
        {VENUE.name} · {VENUE.address} · {VENUE.dates}
      </p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: theme.font.display, fontSize: 20, fontWeight: 900, margin: "0 0 14px" }}>FAQ</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {UMOJA_FAQ.map((f) => (
            <Card key={f.q}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 13.5, color: theme.color.textMuted }}>{f.a}</div>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: theme.font.display, fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Special Events</h2>
        <p style={{ color: theme.color.textMuted, fontSize: 13.5, margin: "0 0 14px" }}>Tournament-wide calendar entries, alongside your team's own games.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SPECIAL_EVENTS.map((e) => (
            <div key={e.id} style={{ background: theme.color.purpleLight + "22", borderRadius: 10, padding: "10px 14px", fontSize: 13.5 }}>
              <strong>{e.label}</strong> — {e.day === "sun" ? "Sunday" : e.day}{"time" in e ? ` ${e.time}` : ""}, {e.field}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: theme.font.display, fontSize: 20, fontWeight: 900, margin: "0 0 14px" }}>Venue & Logistics</h2>
        <Card>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}>{VENUE_LOGISTICS.fieldLayout}</p>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}><strong>Parking:</strong> {VENUE_LOGISTICS.parking}</p>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}><strong>While you're there:</strong> {VENUE_LOGISTICS.onSitePark}</p>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}><strong>Hours:</strong> {VENUE_LOGISTICS.hours}</p>
          <p style={{ margin: 0, fontSize: 14 }}><strong>Venue phone:</strong> {VENUE_LOGISTICS.phone}</p>
        </Card>
      </section>

      <section>
        <h2 style={{ fontFamily: theme.font.display, fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Nearby Things To Do</h2>
        <p style={{ color: theme.color.textMuted, fontSize: 13.5, margin: "0 0 14px" }}>For families with time between games.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {THINGS_TO_DO.map((t) => (
            <Card key={t.name}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 13.5, color: theme.color.textMuted }}>{t.desc}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
