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
    purple: "#7B3FA4",
    purpleLight: "#C084E8",
    blue: "#2E6BC0",
    teal: "#2C9C90",
    tealLight: "#6FC2B5",
    gold: "#F2B95B",
    orange: "#F2856F",
    pink: "#D8365D",
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
} as const;

export const heroGradient = "linear-gradient(115deg,#7B3FA4 0%,#2E6BC0 55%,#2C9C90 100%)";
export const hunterGradient = "linear-gradient(120deg,#D8365D,#EF5A4C)";
