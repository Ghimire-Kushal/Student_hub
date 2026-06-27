export const palette = {
  paper: "#FAF7F1",
  ink: "#1C1917",
  inkMuted: "#78716C",
  border: "#E7E2D8",
  accent: "#8B5CF6",
  accentLight: "#EDE9FE",
} as const;

export const statusColors = {
  NONE: {
    bg: "#F5F5F4",
    text: "#78716C",
    border: "#E7E5E4",
    label: "Not started",
  },
  ONGOING: {
    bg: "#EFF6FF",
    text: "#1D4ED8",
    border: "#BFDBFE",
    label: "Ongoing",
  },
  REVISE: {
    bg: "#FFF7ED",
    text: "#C2410C",
    border: "#FED7AA",
    label: "Revise",
  },
  DONE: {
    bg: "#F0FDF4",
    text: "#15803D",
    border: "#BBF7D0",
    label: "Done",
  },
} as const;

export type UnitStatus = keyof typeof statusColors;
