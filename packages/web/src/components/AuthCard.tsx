import { useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { theme, heroGradient } from "../lib/theme";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: "calc(100vh - 84px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ background: heroGradient, borderRadius: `${theme.radius.lg} ${theme.radius.lg} 0 0`, padding: "20px 18px", color: "#fff", textAlign: "center" }}>
          <img src="/logo-icon.png" alt="Umoja Games" style={{ height: 56, width: "auto", marginBottom: 10 }} />
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 26, letterSpacing: 0.5 }}>{title}</div>
          <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderTop: "none", borderRadius: `0 0 ${theme.radius.lg} ${theme.radius.lg}`, padding: "20px 18px" }}>
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
  width: "100%",
  boxSizing: "border-box",
};

type AuthPasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function AuthPasswordInput(props: AuthPasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        style={{ ...authInputStyle, paddingRight: 44, ...(props.style as CSSProperties | undefined) }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 6,
          display: "flex",
          alignItems: "center",
          color: theme.color.textMuted,
          lineHeight: 0,
        }}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

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
