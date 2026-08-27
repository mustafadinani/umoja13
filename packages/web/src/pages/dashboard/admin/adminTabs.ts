/**
 * The full admin tab set — shared between AdminDashboard (primaryRole
 * "admin") and CommissionerDashboard (primaryRole "commissioner"). The
 * backend already treats commissioner as full staff everywhere (every
 * callable/Firestore rule checks admin OR commissioner), but the UI used to
 * only expose these tabs to admin — a commissioner's dashboard was scoped to
 * just their own desk (finalize queue + incidents) with no way to reach
 * Teams/Players/Check-ins/etc. Pulling the list out here keeps both
 * dashboards' tab sets from drifting apart as tabs get added later.
 */
export type AdminTab =
  | "games" | "teams" | "liveDraw" | "players" | "checkins" | "ops" | "hunt"
  | "volunteers" | "sponsors" | "notifications" | "teamChannels" | "messages"
  | "pods" | "users" | "awards" | "feedback";

export const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "games", label: "All Games" },
  { id: "teams", label: "Teams" },
  { id: "liveDraw", label: "Live Draw" },
  { id: "players", label: "Players" },
  { id: "checkins", label: "Player Check-ins" },
  { id: "ops", label: "Moderation" },
  { id: "hunt", label: "The Hunt" },
  { id: "volunteers", label: "Volunteers" },
  { id: "sponsors", label: "Sponsors" },
  { id: "notifications", label: "Notifications & Announcements" },
  { id: "teamChannels", label: "Team Channels" },
  { id: "messages", label: "Messages" },
  { id: "pods", label: "Pods" },
  { id: "users", label: "Users" },
  { id: "awards", label: "Awards" },
  { id: "feedback", label: "Feedback" },
];
