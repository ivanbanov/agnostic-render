export const content = {
  position: "absolute",
  pointerEvents: "auto",
  background: "#111",
  color: "#fff",
  paddingY: 6,
  paddingX: 10,
  borderRadius: 4,
  fontSize: 13,
  variants: {
    side: {
      top: { bottom: "100%" },
      bottom: { top: "100%" },
      left: { right: "100%" },
      right: { left: "100%" },
    },
    red: {
      true: { background: "#c0392b" },
      false: {},
    },
  },
  defaultVariants: {
    side: "bottom",
    red: false,
  },
};

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
