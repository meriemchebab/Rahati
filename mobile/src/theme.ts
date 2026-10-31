// Rahati design tokens, taken from the Figma file "rahati-mobile-app".
export const colors = {
  bg: "#E6E7FF", // page background
  surface: "#FFFFFF", // cards
  tint: "#F4EEFF", // inner tiles, stats boxes, entries
  lilac: "#E8C5FD", // small actions, journal "write it down", tags
  lavender: "#C5B8FE", // next session, check-in button, topic chips (on)
  purple: "#7673FF", // primary buttons, bars, progress
  navPurple: "#7571FE", // nav bar
  purpleDeep: "#524DFC", // borders on selected purple
  pink: "#FB80FF", // energy bars, AI summary
  pinkSoft: "#FDABFF", // "Need help now?", open calendar, "From Dr." tags
  chipLine: "#E8C5FD", // unselected chip border
  ok: "#1E7B4F", // saved / success text
  okSoft: "#DDF5E8", // saved badge
  ink: "#04000F", // text
  inkSoft: "#2A2540", // small text on colored cards
  muted: "#4B4663", // secondary text
  placeholder: "#8A84A3",
  danger: "#D9351A",
  dangerSoft: "#FDBDB2",
  success: "#2F9E6B",
  white: "#FFFFFF",
};

// Mood faces in the check-in card: 1 (angry) … 5 (excited).
export const moods = [
  { value: 1, label: "Angry", svg: "moodAngry", bg: "#FFE7E3" },
  { value: 2, label: "Sad", svg: "moodSad", bg: "#E9EAFF" },
  { value: 3, label: "Bored", svg: "moodBored", bg: "#FFEBB9" },
  { value: 4, label: "Happy", svg: "moodHappy", bg: "#C8FDF7" },
  { value: 5, label: "Excited", svg: "moodExcited", bg: "#F9DEF6" },
] as const;

export const fonts = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  name: "Nunito_700Bold",
};

export const radius = { card: 28, tile: 20, chip: 20, pill: 24, small: 8 };

import { t } from "./i18n";

// Topic codes from the backend, with the English labels used in the design (translated by t()).
export const topicLabels: Record<string, string> = {
  stress: "Stress",
  sleep: "Sleep",
  family: "Family",
  work_study: "Work or study",
  self_esteem: "Self-esteem",
  relationships: "Relationships",
  body_cycle: "Body or cycle",
};
export const topicLabel = (code: string | null | undefined, fallback?: string | null) =>
  code && topicLabels[code] ? t(topicLabels[code]) : fallback || t("General");
