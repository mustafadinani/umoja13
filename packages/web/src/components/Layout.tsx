import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { NotificationsBell } from "./NotificationsBell";
import { AskUmojaWidget } from "./AskUmojaWidget";

const NAV_ITEMS: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "Game Day", to: "/schedule" },
  { label: "Standings & Bracket", to: "/standings" },
  { label: "Moments", to: "/moments" },
  { label: "The Hunt", to: "/hunt" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const barStyle: CSSProperties = {
    background: theme.color.navy,
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 50,
  };
  const barInner: CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "10px 24px",
    display: "flex",
    alignItems: "center",
    gap: "14px 24px",
    minHeight: 64,
    flexWrap: "wrap",
  };
  const brandStyle: CSSProperties = {
    fontFamily: theme.font.display,
    fontWeight: 800,
    fontSize: 24,
    letterSpacing: 1.5,
    background: `linear-gradient(90deg, ${theme.color.purpleLight}, ${theme.color.orange}, ${theme.color.tealLight})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.color.bg, color: theme.color.text }}>
      <div style={barStyle}>
        <div style={barInner}>
          <Link to="/" style={brandStyle}>UMOJA GAMES</Link>
          <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    background: active ? "rgba(255,255,255,.12)" : "transparent",
                    color: active ? theme.color.gold : "#fff",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user && profile ? (
              <>
                <NotificationsBell />
                <Link
                  to="/dashboard"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13.5,
                    background: theme.color.gold,
                    color: theme.color.navy,
                  }}
                >
                  My Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#A79FC0",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13.5,
                  background: theme.color.gold,
                  color: theme.color.navy,
                  border: "none",
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
      {children}
      <AskUmojaWidget />
    </div>
  );
}
