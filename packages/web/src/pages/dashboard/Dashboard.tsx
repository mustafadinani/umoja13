import { useAuth } from "../../auth/AuthProvider";
import { PlayerDashboard } from "./player/PlayerDashboard";
import { FanDashboard } from "./fan/FanDashboard";
import { RefereeDashboard } from "./referee/RefereeDashboard";
import { CommissionerDashboard } from "./commissioner/CommissionerDashboard";
import { AdminDashboard } from "./admin/AdminDashboard";
import { VolunteerDashboard } from "./volunteer/VolunteerDashboard";

/** Renders the dashboard matching the signed-in user's primaryRole. */
export function Dashboard() {
  const { profile } = useAuth();
  if (!profile) return null;

  switch (profile.primaryRole) {
    case "player":
    case "captain":
      return <PlayerDashboard />;
    case "volunteer":
      return <VolunteerDashboard />;
    case "referee":
      return <RefereeDashboard />;
    case "commissioner":
      return <CommissionerDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <FanDashboard />;
  }
}
