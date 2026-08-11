import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { theme } from "../../lib/theme";
import { setActiveRole } from "../../lib/callables";
import { ROLE_LABELS } from "../../lib/roleLabels";
import { Pill } from "../../components/ui";
import { PlayerDashboard } from "./player/PlayerDashboard";
import { FanDashboard } from "./fan/FanDashboard";
import { RefereeDashboard } from "./referee/RefereeDashboard";
import { CommissionerDashboard } from "./commissioner/CommissionerDashboard";
import { AdminDashboard } from "./admin/AdminDashboard";
import { VolunteerDashboard } from "./volunteer/VolunteerDashboard";

/** Lets someone holding more than one role pick which one is "active" — drives which dashboard Dashboard renders below. Renders nothing for a single-role account. */
function RoleSwitcher({ roles, primaryRole }: { roles: string[]; primaryRole: string }) {
  const [switching, setSwitching] = useState<string | null>(null);

  if (roles.length <= 1) return null;

  async function switchTo(role: string) {
    if (role === primaryRole) return;
    setSwitching(role);
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
        {roles.map((r) => (
          <Pill key={r} active={r === primaryRole} onClick={() => switchTo(r)}>
            {switching === r ? "…" : ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}
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
    case "captain":
    case "coach_manager":
      body = <PlayerDashboard />;
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
