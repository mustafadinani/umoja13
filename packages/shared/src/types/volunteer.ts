/**
 * Public "Become a Volunteer" sign-up (packages/web/src/components/BecomeVolunteerModal.tsx),
 * reviewed by admin/commissioner in the Volunteers admin tab. Approval grants
 * the "volunteer" role via the reviewVolunteerApplication Cloud Function
 * (same custom-claims + Firestore roles pattern as setUserRole).
 */
export type VolunteerApplicationStatus = "pending" | "approved" | "rejected";

export interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  emergencyContact: string;
  availability: string[]; // subset of VOLUNTEER_AVAILABILITY_DAYS
  selfieUrl?: string;
  status: VolunteerApplicationStatus;
  filedByUid: string;
  createdAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
}

export const VOLUNTEER_AVAILABILITY_DAYS = ["Fri", "Sat", "Sun"] as const;

export type VolunteerTaskType = "setup" | "checkin_support" | "water_shade" | "packdown" | "custom";

export const VOLUNTEER_TASK_TYPES: { id: VolunteerTaskType; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "checkin_support", label: "Check-in support" },
  { id: "water_shade", label: "Water/Shade" },
  { id: "packdown", label: "Pack-down" },
  { id: "custom", label: "Custom" },
];

export const VOLUNTEER_TASK_TIMES = [
  "Fri 8–9 AM",
  "Fri 9 AM–12 PM",
  "Fri 12–2 PM",
  "Sat 8–10 AM",
  "Sat 10 AM–1 PM",
  "Sun 8 AM–2 PM",
] as const;

export const VOLUNTEER_TASK_LOCATIONS = ["Main HQ", "Field 1–3", "Field 4–6", "Entrance", "Food court"] as const;

/** A shift/task, either open (unassigned) or assigned to one volunteer. */
export interface VolunteerTask {
  id: string;
  title: string;
  type: VolunteerTaskType;
  time: string;
  location: string;
  assigneeUid: string | null;
  assigneeName: string | null;
  done: boolean;
  cantMake: boolean;
  cantMakeReason?: string;
  createdAt: number;
  createdBy: string;
}
