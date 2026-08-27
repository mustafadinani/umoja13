import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { theme } from "../../lib/theme";
import { setActiveRole } from "../../lib/callables";
import { ROLE_LABELS } from "../../lib/roleLabels";
import { Pill } from "../../components/ui";
import { PlayerDashboard } from "./player/PlayerDashboard";
import { TeamOfficialDashboard } from "./player/TeamOfficialDashboard";
import { FanDashboard } from "./fan/FanDashboard";
import { RefereeDashboard } from "./referee/RefereeDashboard";
import { CommissionerDashboard } from "./commissioner/CommissionerDashboard";
import { AdminDashboard } from "./admin/AdminDashboard";
import { VolunteerDashboard } from "./volunteer/VolunteerDashboard";

/**
 * Lets someone holding more than one role pick which one is "active" —
 * drives which dashboard Dashboard renders below. Renders nothing for a
 * single-role account (after the captain/coach_manager merge below —
 * someone holding ONLY those two still counts as one role for this check).
 *
 * captain and coach_manager collapse into a single "Team Official" pill —
 * whoever holds EITHER one gets it, not just accounts holding both (an OR,
 * not an AND): coach_manager is legacy data now (assignTeamOfficial only
 * ever grants captain going forward — see its top comment), so plenty of
 * real accounts hold only coach_manager and must still see this pill.
 */
function RoleSwitcher({ roles, primaryRole }: { roles: string[]; primaryRole: string }) {
  const [switching, setSwitching] = useState<string | null>(null);

  const isOfficial = (r: string) => r === "captain" || r === "coach_manager";
  // Dedup captain/coach_manager down to one "team_official" entry, preserving
  // everything else as-is. Order follows `roles` as given, keyed to whichever
  // slot the merged pair first appears in.
  const displayRoles: string[] = [];
  for (const r of roles) {
    const key = isOfficial(r) ? "team_official" : r;
    if (!displayRoles.includes(key)) displayRoles.push(key);
  }

  if (displayRoles.length <= 1) return null;

  // The account may hold captain, coach_manager, or (rarely) both — prefer
  // captain as the canonical target since that's the only one new grants
  // ever produce; an account with only legacy coach_manager falls back to it.
  const officialRole = roles.includes("captain") ? "captain" : "coach_manager";
  const activePill = isOfficial(primaryRole) ? "team_official" : primaryRole;

  async function switchTo(displayKey: string) {
    const role = displayKey === "team_official" ? officialRole : displayKey;
    if (role === primaryRole) return;
    setSwitching(displayKey);
    try {
      await setActiveRole({ role });
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div className="page-shell-sm" style={{ paddingBottom: 0 }}>
      <div style={{ color: theme.color.textMuted, fontWeight: 700, fontSize: 12, letterSpacing: 1, marginBottom: 6 }}>VIEWING AS</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {displayRoles.map((r) => (
          <Pill key={r} active={r === activePill} onClick={() => switchTo(r)}>
            {switching === r ? "…" : r === "team_official" ? "Team Official" : ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}
          </Pill>
        ))}
      </div>
    </div>
  );
}

/** Renders the dashboard matching the signed-in user's primaryRole. */
export function Dashboard() {
  const { profile } = useAuth();
  if (!profile) return null;

  let body;
  switch (profile.primaryRole) {
    case "player":
      body = <PlayerDashboard />;
      break;
    // Own tabbed view, scoped entirely to teams officiated — never mixed
    // with personal player content (see TeamOfficialDashboard's top comment).
    case "captain":
    case "coach_manager":
      body = <TeamOfficialDashboard />;
      break;
    case "volunteer":
      body = <VolunteerDashboard />;
      break;
    case "referee":
      body = <RefereeDashboard />;
      break;
    case "commissioner":
      body = <CommissionerDashboard />;
      break;
    case "admin":
      body = <AdminDashboard />;
      break;
    default:
      body = <FanDashboard />;
  }

  return (
    <>
      <RoleSwitcher roles={profile.roles} primaryRole={profile.primaryRole} />
      {body}
    </>
  );
}
