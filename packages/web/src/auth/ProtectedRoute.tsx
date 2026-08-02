import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "@umoja/shared";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children, requireRole }: { children: ReactNode; requireRole?: Role[] }) {
  const { user, profile, loading } = useAuth();

  // Don't unmount the page on brief profile reloads — that was wiping the
  // report-to-commissioner modal (including the Stripe card step).
  if (loading && !user) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && profile && !requireRole.some((r) => profile.roles.includes(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
