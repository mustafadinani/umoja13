// Design tokens transcribed from the Umoja13 web prototype
// (project/Umoja Web App.dc.html) — keep in sync with packages/mobile/src/lib/theme.ts,
// whose values come from the separate mobile prototype and intentionally differ
// where the two prototypes differ (e.g. heroGradient).
export const theme = {
  color: {
    navy: "#211A33",
    text: "#211A33",
    textMuted: "#6F6981",
    border: "#EAE7F0",
    bg: "#F7F6F3",
    purple: "#8B2FD1",
    purpleLight: "#C084E8",
    blue: "#2563EB",
    teal: "#0FAE9E",
    tealLight: "#6FC2B5",
    gold: "#FDB528",
    orange: "#F2856F",
    pink: "#EC3B63",
    danger: "#C0392B",
    dangerBg: "#FBE3DF",
    success: "#1E7A6F",
    successBg: "#E2F2EF",
    warning: "#8A5A0F",
    warningBg: "#FBEEDC",
  },
  radius: {
    sm: "10px",
    md: "12px",
    lg: "16px",
    pill: "999px",
  },
  font: {
    display: "'Barlow Condensed', sans-serif",
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
  },
} as const;

export const heroGradient = "linear-gradient(115deg,#8B2FD1 0%,#2563EB 55%,#0FAE9E 100%)";
export const hunterGradient = "linear-gradient(120deg,#EC3B63,#FF5A3C)";
