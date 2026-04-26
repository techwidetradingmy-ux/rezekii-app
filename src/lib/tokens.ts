// ============================================
// REZEKII DESIGN TOKENS — Brand Kit v3.0
// ============================================

export const colors = {
  // Tier 1 Primary
  green: "#00c073",
  greenHover: "#009a5c",
  greenTint: "rgba(0,192,115,0.09)",
  black: "#0d1117",
  white: "#ffffff",

  // Tier 2 TikTok accent — ONLY on TikTok OAuth/branded buttons
  cyan: "#25f4ee",

  // Tier 3 Warm gradient — logo accent & milestone badges ONLY
  warmStart: "#f5a623",
  warmEnd: "#e8005a",

  // Neutrals
  canvas: "#f5fdf7",
  border: "#d8f0e4",
  bodyText: "#4a5568",
  muted: "#9aa5b1",
} as const;

export const typography = {
  hero:     { size: "32px", weight: 800 },
  earnings: { size: "24px", weight: 700 },
  h1:       { size: "22px", weight: 700 },
  h2:       { size: "18px", weight: 700 },
  button:   { size: "15px", weight: 700 },
  body:     { size: "14px", weight: 400 },
  label:    { size: "13px", weight: 500 },
  caption:  { size: "11px", weight: 500 },
} as const;

export const spacing = {
  screenMargin: "20px",
  cardPadding: "16px",
  grid: 8,
} as const;

export const radii = {
  input:     "10px",
  button:    "12px",
  card:      "16px",
  pill:      "20px",
} as const;

export const shadows = {
  card: "0 2px 12px rgba(0,0,0,0.06)",
  tab:  "0 -1px 0 #d8f0e4",
} as const;

export const motion = {
  easing: "cubic-bezier(.2,.7,.2,1)",
  tap: "120ms",
  state: "200ms",
  transition: "320ms",
} as const;

export const tabBar = {
  height: 49,
  safeArea: 34,
  total: 83,
  activeColor: "#00c073",
  inactiveColor: "#9aa5b1",
  iconSize: 28,
} as const;

export const button = {
  height: "52px",
  radius: "12px",
} as const;
