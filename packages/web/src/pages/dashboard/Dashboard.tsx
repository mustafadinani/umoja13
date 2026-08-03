import { useAuth } from "../../auth/AuthProvider";
import { PlayerDashboard } from "./player/PlayerDashboard";
import { FanDashboard } from "./fan/FanDashboard";
import { RefereeDashboard } from "./referee/RefereeDashboard";
import { CommissionerDashboard } from "./commissioner/CommissionerDashboard";
import { AdminDashboard } from "./admin/AdminDashboard";
import { VolunteerDashboard } from "./volunteer/VolunteerDashboard";
import { ComplaintPaymentReturnBanner } from "./ComplaintPaymentReturnBanner";

/** Renders the dashboard matching the signed-in user's primaryRole. */
export function Dashboard() {
  const { profile } = useAuth();
  if (!profile) return null;

  let body;
  switch (profile.primaryRole) {
    case "player":
    case "captain":
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
      <ComplaintPaymentReturnBanner />
      {body}
    </>
  );
}
