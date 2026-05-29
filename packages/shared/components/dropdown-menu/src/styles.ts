export const positioner = {
  position: "fixed",
  width: 0,
  height: 0,
  variants: {
    anchored: {
      true: { visibility: "visible" },
      false: { visibility: "hidden" },
    },
  },
  defaultVariants: {
    anchored: false,
  },
};

export const content = {
  position: "absolute",
  pointerEvents: "auto",
  background: "#1f2937",
  color: "#fff",
  borderRadius: 6,
  paddingY: 4,
  paddingX: 0,
  fontSize: 13,
  minWidth: 180,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
  variants: {
    side: {
      top: { bottom: "100%" },
      bottom: { top: "100%" },
      left: { right: "100%" },
      right: { left: "100%" },
    },
  },
  defaultVariants: {
    side: "bottom",
  },
};

export const item = {
  display: "flex",
  alignItems: "center",
  paddingY: 6,
  paddingX: 12,
  cursor: "default",
  userSelect: "none",
  outline: "none",
  variants: {
    highlighted: {
      true: { background: "#374151" },
      false: { background: "transparent" },
    },
    disabled: {
      true: { opacity: 0.5, cursor: "not-allowed" },
      false: {},
    },
  },
  defaultVariants: {
    highlighted: false,
    disabled: false,
  },
};

export const separator = {
  height: 1,
  marginY: 4,
  marginX: 0,
  background: "#374151",
  variants: {},
};

export const label = {
  paddingY: 6,
  paddingX: 12,
  fontSize: 11,
  fontWeight: 600,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  variants: {},
};

export const group = {
  display: "block",
  variants: {},
};
