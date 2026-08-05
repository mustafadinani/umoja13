import { useState } from "react";
import { TRAVEL_GUIDE, LOCAL_EXPERIENCES, MUSLIM_FAMILY_GUIDE, UMOJA_FAQ, VENUE_LOGISTICS, VENUE, SPECIAL_EVENTS } from "@umoja/shared";
import { theme } from "../lib/theme";
import { Card, Pill } from "../components/ui";

type Seg = "info" | "travel" | "local" | "muslim";

/** Merged with the old standalone Info page — FAQ/venue/logistics are just another facet of "everything besides the games," same as travel planning or the local guide. One tab, one nav item, instead of two overlapping pages. */
export function Experiences() {
  const [seg, setSeg] = useState<Seg>("info");

  return (
    <div className="page-shell-sm" style={{ maxWidth: 820 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 4 }}>INFO & EXPERIENCES</div>
      <p style={{ color: theme.color.textMuted, fontSize: 14.5, margin: "0 0 20px" }}>
        Everything about your Umoja Games weekend, on and off the field.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <Pill active={seg === "info"} onClick={() => setSeg("info")}>ℹ️ Event Info</Pill>
        <Pill active={seg === "travel"} onClick={() => setSeg("travel")}>✈️ Travel & Budget</Pill>
        <Pill active={seg === "local"} onClick={() => setSeg("local")}>🎡 Local Experiences</Pill>
        <Pill active={seg === "muslim"} onClick={() => setSeg("muslim")}>🌙 Muslim Family Guide</Pill>
      </div>

      {seg === "info" && <InfoSection />}
      {seg === "travel" && <TravelSection />}
      {seg === "local" && <LocalSection />}
      {seg === "muslim" && <MuslimSection />}
    </div>
  );
}

function InfoSection() {
  return (
    <div>
      <p style={{ color: theme.color.textMuted, fontSize: 14, margin: "0 0 24px" }}>
        {VENUE.name} · {VENUE.address} · {VENUE.dates}
      </p>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>FAQ</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {UMOJA_FAQ.map((f) => (
            <Card key={f.q}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 13.5, color: theme.color.textMuted }}>{f.a}</div>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Special Events</SectionTitle>
        <p style={{ color: theme.color.textMuted, fontSize: 13.5, margin: "0 0 14px" }}>Tournament-wide calendar entries, alongside your team's own games.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SPECIAL_EVENTS.map((e) => (
            <div key={e.id} style={{ background: theme.color.purpleLight + "22", borderRadius: 10, padding: "10px 14px", fontSize: 13.5 }}>
              <strong>{e.label}</strong> — {e.day === "sun" ? "Sunday" : e.day}{"time" in e ? ` ${e.time}` : ""}, {e.field}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Venue & Logistics</SectionTitle>
        <Card>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}>{VENUE_LOGISTICS.fieldLayout}</p>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}><strong>Parking:</strong> {VENUE_LOGISTICS.parking}</p>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}><strong>While you're there:</strong> {VENUE_LOGISTICS.onSitePark}</p>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}><strong>Hours:</strong> {VENUE_LOGISTICS.hours}</p>
          <p style={{ margin: 0, fontSize: 14 }}><strong>Venue phone:</strong> {VENUE_LOGISTICS.phone}</p>
        </Card>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 style={{ fontFamily: theme.font.display, fontSize: 20, fontWeight: 900, margin: "0 0 12px" }}>{children}</h2>;
}

function TravelSection() {
  return (
    <div>
      <p style={{ fontSize: 14, color: theme.color.text, marginBottom: 28 }}>{TRAVEL_GUIDE.intro}</p>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>✈️ Flights — Get to the Action!</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {TRAVEL_GUIDE.airports.map((a) => (
            <Card key={a.code}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{a.code} — {a.name}</div>
                <div style={{ fontSize: 12.5, color: theme.color.purple, fontWeight: 700 }}>{a.driveTime}</div>
              </div>
              {a.note && <div style={{ fontSize: 12.5, color: theme.color.textMuted, fontStyle: "italic", marginTop: 2 }}>{a.note}</div>}
              <div style={{ fontSize: 13, marginTop: 6 }}>Airlines: {a.airlines}</div>
            </Card>
          ))}
        </div>
        <div style={{ background: "#F1EFF5", borderRadius: theme.radius.sm, padding: 12, fontSize: 13, marginBottom: 20 }}>
          💡 {TRAVEL_GUIDE.internationalNote}
        </div>

        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Airline Discount Codes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TRAVEL_GUIDE.airlineDiscountCodes.map((c) => (
            <Card key={c.airline} style={{ padding: "10px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.airline} — <span style={{ color: theme.color.purple }}>{c.code}</span></div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{c.instructions}</div>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>🏨 Hotels — Stay & Play with Umoja!</SectionTitle>
        <Card style={{ marginBottom: 14, background: "#F1EFF5" }}>
          <div style={{ fontSize: 13.5, marginBottom: 8 }}>{TRAVEL_GUIDE.hotelDeposit.note}</div>
          <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 13.5 }}>
            {TRAVEL_GUIDE.hotelDeposit.tiers.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <div style={{ fontSize: 13, color: theme.color.textMuted }}>{TRAVEL_GUIDE.hotelDeposit.fullPrice}</div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {TRAVEL_GUIDE.hotels.map((h) => (
            <Card key={h.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{h.name}</div>
                  {h.isHeadquarters && (
                    <div style={{ display: "inline-block", background: theme.color.gold, color: theme.color.navy, fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99, marginTop: 4 }}>
                      OUR HEADQUARTERS HOTEL
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 800, color: theme.color.purple, fontSize: 15, whiteSpace: "nowrap" }}>{h.pricePerNight}</div>
              </div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 6 }}>
                {h.distance} · {h.driveTime} · {h.bedTypes} · Tax: {h.tax}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>{h.perks}</div>
            </Card>
          ))}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: theme.color.textMuted }}>
          {TRAVEL_GUIDE.hotelPricingNotes.map((n) => <li key={n} style={{ marginBottom: 4 }}>{n}</li>)}
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>🚗 Rental Cars — Get Around & Explore!</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TRAVEL_GUIDE.rentalCars.map((r) => (
            <Card key={r.company} style={{ padding: "10px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.company} — <span style={{ color: theme.color.purple }}>{r.code}</span></div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{r.instructions}</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>💰 Plan Your Umoja Budget</SectionTitle>
        <p style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 14, fontStyle: "italic" }}>{TRAVEL_GUIDE.budgetNote}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TRAVEL_GUIDE.budgetTiers.map((t) => (
            <Card key={t.region}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.region}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, fontStyle: "italic", marginTop: 2 }}>{t.cities}</div>
              <div style={{ fontSize: 12.5, marginTop: 6, fontWeight: 600 }}>{t.travelTime}</div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}>👤 Solo: {t.solo}</div>
              <div style={{ fontSize: 12.5, marginTop: 2 }}>👨‍👩‍👧‍👦 Family of 4: {t.family}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function LocalSection() {
  return (
    <div>
      <p style={{ fontSize: 14, color: theme.color.text, marginBottom: 20 }}>
        Explore the best local attractions and activities near the SoccerPlex — from adventure parks and escape rooms to farms, state parks, and museums — all within 35 minutes of your tournament base. Sorted closest to farthest.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {LOCAL_EXPERIENCES.map((e) => (
          <Card key={e.name} style={e.featured ? { border: `2px solid ${theme.color.gold}` } : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {e.emoji} {e.name}
                  {e.featured && (
                    <span style={{ marginLeft: 8, background: theme.color.gold, color: theme.color.navy, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 99 }}>
                      ★ UMOJA PICK
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{e.city}</div>
              </div>
              <div style={{ fontSize: 12.5, color: theme.color.purple, fontWeight: 700, whiteSpace: "nowrap" }}>{e.distance} · {e.driveTime}</div>
            </div>
            <div style={{ fontSize: 13, fontStyle: "italic", color: theme.color.textMuted, marginTop: 6 }}>{e.tagline}</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>{e.description}</div>
            <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 8 }}>
              📍 {e.address}
              {e.hours && <> · 🕐 {e.hours}</>}
              {e.pricing && <> · 💵 {e.pricing}</>}
              {e.website && <> · 🌐 {e.website}</>}
            </div>
            {e.umojaOffer && (
              <div style={{ background: theme.color.successBg, color: theme.color.success, borderRadius: theme.radius.sm, padding: 10, fontSize: 12.5, marginTop: 10, fontWeight: 600 }}>
                🎟️ Umoja Partner Offer: {e.umojaOffer}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MuslimSection() {
  const g = MUSLIM_FAMILY_GUIDE;
  return (
    <div>
      <p style={{ fontSize: 14, color: theme.color.text, marginBottom: 8 }}>{g.intro}</p>
      <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 24 }}>
        {g.stats.mosques} Mosques · {g.stats.restaurants} Halal Restaurants · {g.stats.markets} Halal Markets
      </div>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>🕐 Estimated Prayer Times</SectionTitle>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            <PrayerTime label="Fajr" time={g.prayerTimes.fajr} />
            <PrayerTime label="Dhuhr" time={g.prayerTimes.dhuhr} />
            <PrayerTime label="Asr" time={g.prayerTimes.asr} />
            <PrayerTime label="Maghrib" time={g.prayerTimes.maghrib} />
            <PrayerTime label="Isha" time={g.prayerTimes.isha} />
            <PrayerTime label="Jumu'ah" time={g.prayerTimes.jumuah} />
          </div>
        </Card>
        <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 8, fontStyle: "italic" }}>⚠️ {g.prayerTimesNote}</div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>🕌 Mosques & Prayer Spaces</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {g.mosques.map((m) => (
            <Card key={m.name}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, fontStyle: "italic", marginTop: 2 }}>{m.tagline}</div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}>{m.description}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 6 }}>📍 {m.address} · {m.distance} · {m.driveTime} · 🌐 {m.website}</div>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>🛒 Halal Grocery & Markets</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {g.halalMarkets.map((m) => (
            <Card key={m.name}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}{m.rating && <span style={{ color: theme.color.gold, marginLeft: 6 }}>⭐ {m.rating}</span>}</div>
              <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{m.type}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>📍 {m.address} · {m.distance} · {m.driveTime}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>🕐 {m.hours} · ☎️ {m.phone}</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>🍽️ Halal Restaurants Near SoccerPlex</SectionTitle>
        <p style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 12 }}>⭐ = closest options, under 5 miles</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {g.halalRestaurants.map((r) => (
            <Card key={r.name} style={{ padding: "10px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.closest && "⭐ "}{r.name} <span style={{ color: theme.color.textMuted, fontWeight: 400, fontSize: 12 }}>{r.distance}</span></div>
              {r.locations.map((loc) => <div key={loc} style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>📍 {loc}</div>)}
              <div style={{ fontSize: 12, marginTop: 2 }}>🌐 {r.website}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function PrayerTime({ label, time }: { label: string; time: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11.5, color: theme.color.textMuted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{time}</div>
    </div>
  );
}
