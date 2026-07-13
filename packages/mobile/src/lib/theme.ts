// Design tokens transcribed from the Umoja13 mobile prototype
// (project/Umoja Mobile App.dc.html) — keep in sync with packages/web/src/lib/theme.ts,
// whose values come from the separate web prototype and intentionally differ
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
    sm: 10,
    md: 12,
    lg: 16,
    pill: 999,
  },
  font: {
    display: "Barlow Condensed",
  },
} as const;

export const heroGradient = [theme.color.purple, theme.color.blue] as const;
export const hunterGradient = [theme.color.pink, "#EF5A4C"] as const;
