import type { CSSProperties, ReactNode } from "react";
import { theme, heroGradient } from "../lib/theme";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: "calc(100vh - 84px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ background: heroGradient, borderRadius: `${theme.radius.lg} ${theme.radius.lg} 0 0`, padding: "22px 26px", color: "#fff", textAlign: "center" }}>
          <img src="/logo-icon.png" alt="Umoja Games" style={{ height: 56, width: "auto", marginBottom: 10 }} />
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 26, letterSpacing: 0.5 }}>{title}</div>
          <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderTop: "none", borderRadius: `0 0 ${theme.radius.lg} ${theme.radius.lg}`, padding: 26 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export const authInputStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.color.border}`,
  fontSize: 14.5,
  outline: "none",
};

export const authButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: "13px 20px",
  borderRadius: theme.radius.sm,
  border: "none",
  background: theme.color.navy,
  color: "#fff",
  fontFamily: theme.font.display,
  fontWeight: 800,
  fontSize: 16,
  letterSpacing: 1,
};

export const authErrorStyle: CSSProperties = {
  background: theme.color.dangerBg,
  color: theme.color.danger,
  borderRadius: theme.radius.sm,
  padding: "10px 12px",
  fontSize: 13,
};
