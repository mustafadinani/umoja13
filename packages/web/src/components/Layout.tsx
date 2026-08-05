import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useIsMobile } from "../hooks/useMediaQuery";
import { NotificationsBell } from "./NotificationsBell";
import { MessagesBell } from "./MessagesBell";
import { AskUmojaWidget } from "./AskUmojaWidget";

// Shown to everyone signed in, whether or not they're on a pod yet — the
// /pods page itself handles the two cases: prompts a non-volunteer to sign
// up, or shows a volunteer/staff member their pods plus open ones to join.
const BASE_NAV_ITEMS: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "Game Day", to: "/schedule" },
  { label: "Standings & Bracket", to: "/standings" },
  { label: "Moments", to: "/moments" },
  { label: "The Hunt", to: "/hunt" },
  { label: "Experiences", to: "/experiences" },
  { label: "Info", to: "/info" },
];
const SIGNED_IN_NAV_ITEMS = [...BASE_NAV_ITEMS, { label: "Pods", to: "/pods" }];

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV_ITEMS = user ? SIGNED_IN_NAV_ITEMS : BASE_NAV_ITEMS;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

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
    padding: isMobile ? "10px 16px" : "10px 24px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
  };
  const brandStyle: CSSProperties = {
    fontFamily: theme.font.display,
    fontWeight: 800,
    fontSize: isMobile ? 20 : 24,
    letterSpacing: 1.5,
    background: `linear-gradient(90deg, ${theme.color.purpleLight}, ${theme.color.orange}, ${theme.color.tealLight})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  };

  const linkStyle = (active: boolean): CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: "nowrap",
    background: active ? "rgba(255,255,255,.12)" : "transparent",
    color: active ? theme.color.gold : "#fff",
    display: "block",
  });

  return (
    <div style={{ minHeight: "100vh", background: theme.color.bg, color: theme.color.text, overflowX: "hidden" }}>
      <div style={barStyle}>
        <div style={barInner}>
          <Link to="/" style={brandStyle}>
            <img src="/logo-icon.png" alt="" style={{ height: isMobile ? 28 : 32, width: "auto" }} />
            UMOJA GAMES
          </Link>

          <div className="nav-desktop" style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap", marginLeft: 8 }}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} style={linkStyle(pathname === item.to)}>
                {item.label}
              </Link>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
            {user && profile && (
              <>
                <MessagesBell />
                <NotificationsBell />
              </>
            )}

            <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {user && profile ? (
                <>
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
                    type="button"
                    onClick={() => void signOut()}
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
                  type="button"
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

            <button
              type="button"
              className="nav-mobile-only"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: "none",
                width: 42,
                height: 42,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.2)",
                background: menuOpen ? "rgba(255,255,255,.12)" : "transparent",
                color: "#fff",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {menuOpen && isMobile && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,.1)",
              background: theme.color.navy,
              padding: "8px 12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              maxHeight: "calc(100vh - 56px)",
              overflowY: "auto",
            }}
          >
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} style={linkStyle(pathname === item.to)} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,.12)", margin: "8px 4px" }} />
            {user && profile ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    ...linkStyle(pathname === "/dashboard"),
                    background: theme.color.gold,
                    color: theme.color.navy,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  My Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut();
                  }}
                  style={{
                    ...linkStyle(false),
                    background: "transparent",
                    border: "none",
                    color: "#A79FC0",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/login");
                }}
                style={{
                  ...linkStyle(false),
                  background: theme.color.gold,
                  color: theme.color.navy,
                  border: "none",
                  fontWeight: 800,
                  width: "100%",
                }}
              >
                Sign in
              </button>
            )}
          </div>
        )}
      </div>
      {children}
      <AskUmojaWidget />
    </div>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  const bar: CSSProperties = {
    display: "block",
    width: 18,
    height: 2,
    background: "#fff",
    borderRadius: 1,
    transition: "transform .2s ease, opacity .2s ease",
  };
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, width: 18 }}>
      <span style={{ ...bar, transform: open ? "translateY(6px) rotate(45deg)" : undefined }} />
      <span style={{ ...bar, opacity: open ? 0 : 1 }} />
      <span style={{ ...bar, transform: open ? "translateY(-6px) rotate(-45deg)" : undefined }} />
    </span>
  );
}
