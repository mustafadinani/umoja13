import { useAuth } from "../../auth/AuthProvider";
import { theme } from "../../lib/theme";
import { useMyPods } from "../../hooks/useData";
import { PlayerDashboard } from "./player/PlayerDashboard";
import { FanDashboard } from "./fan/FanDashboard";
import { RefereeDashboard } from "./referee/RefereeDashboard";
import { CommissionerDashboard } from "./commissioner/CommissionerDashboard";
import { AdminDashboard } from "./admin/AdminDashboard";
import { VolunteerDashboard } from "./volunteer/VolunteerDashboard";
import { ComplaintPaymentReturnBanner } from "./ComplaintPaymentReturnBanner";
import { MyPodsPanel } from "../../components/MyPodsPanel";

/** Renders the dashboard matching the signed-in user's primaryRole. */
export function Dashboard() {
  const { user, profile } = useAuth();
  const { data: pods } = useMyPods(user?.uid);
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
      {/* Shown for anyone on a pod, regardless of role — pod membership isn't
          tied to primaryRole (a plain fan/player can be recruited onto a
          pod), so this can't live inside just the staff-ish dashboards. */}
      {pods.length > 0 && (
        <div className="page-shell-sm" style={{ paddingBottom: 0 }}>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>MY PODS</div>
          <MyPodsPanel />
        </div>
      )}
      {body}
    </>
  );
}
