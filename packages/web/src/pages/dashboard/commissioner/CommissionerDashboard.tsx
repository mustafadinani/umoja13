import { useState } from "react";
import { where } from "firebase/firestore";
import { theme } from "../../../lib/theme";
import { useGames, useIncidents } from "../../../hooks/useData";
import { Card, IncidentStatusPill, Pill } from "../../../components/ui";
import { IncidentReplyModal } from "../../../components/IncidentReplyModal";
import { MyPodTasksSection } from "../../../components/MyPodTasksSection";
import { AllGamesTab } from "../admin/AllGamesTab";

type CommissionerTab = "gameCards" | "complaints";
const TABS: { id: CommissionerTab; label: string }[] = [
  { id: "gameCards", label: "Game Cards" },
  { id: "complaints", label: "Complaints" },
];

/**
 * A commissioner's own two jobs — game cards (which is really just the full
 * games list, with cards awaiting review surfaced first — see AllGamesTab)
 * and complaints/incidents to work. Deliberately NOT the full admin tab
 * set: a commissioner doesn't manage Teams/Players/Volunteers/Sponsors/
 * Users/etc. day to day.
 *
 * "Game Cards" and "Games" used to be two separate tabs here — a dedicated
 * review-only list plus a whole separate tab just to print or browse the
 * schedule. They're the same underlying thing (games, and where each one's
 * card happens to be), so AllGamesTab itself now carries the awaiting-review
 * section and the print/review/final actions — one tab, not two.
 */
export function CommissionerDashboard() {
  // Scoped query just for the tab-pill count — AllGamesTab computes its own
  // full awaiting-review list internally from the same games collection.
  const { data: awaitingGames } = useGames([where("gameCard.status", "==", "awaiting_commissioner")]);
  const { data: incidents } = useIncidents();
  const [tab, setTab] = useState<CommissionerTab>("gameCards");
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);

  const openIncident = incidents.find((i) => i.id === openIncidentId) ?? null;
  const pendingIncidents = incidents.filter((i) => i.status !== "resolved" && i.status !== "denied").length;

  return (
    <div className="page-shell" style={{ maxWidth: 1000 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>COMMISSIONER DESK</div>

      <MyPodTasksSection />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "gameCards" && awaitingGames.length > 0 && ` (${awaitingGames.length})`}
            {t.id === "complaints" && pendingIncidents > 0 && ` (${pendingIncidents})`}
          </Pill>
        ))}
      </div>

      {tab === "gameCards" && <AllGamesTab />}

      {tab === "complaints" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {incidents.map((i) => (
            <Card key={i.id} onClick={() => setOpenIncidentId(i.id)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {sourceIcon(i.source)} {i.filedByName} — {i.source.replace("_", " ")}
                </div>
                <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>#{i.caseNumber} · {i.text.slice(0, 80)}</div>
              </div>
              <IncidentStatusPill status={i.status} />
            </Card>
          ))}
          {incidents.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>Nothing here.</div>}
        </div>
      )}

      {openIncident && <IncidentReplyModal incident={openIncident} onClose={() => setOpenIncidentId(null)} />}
    </div>
  );
}

function sourceIcon(source: string): string {
  return { captain_complaint: "📝", referee_flag: "🚩", forfeit: "🚩", fan_message: "💬", volunteer_message: "🙋" }[source] ?? "•";
}
