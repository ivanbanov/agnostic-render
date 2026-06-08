/* eslint-disable */
import { styled } from "@render-experiment/style-engine-react";

// Source: shared/components/dropdown-menu/src/styles → content
export const Content = styled(
  "div",
  {
  "position": "absolute",
  "pointerEvents": "auto",
  "background": "#FFFFFF",
  "color": "#222428",
  "borderRadius": 4,
  "padding": "12px 12px",
  "fontSize": 14,
  "lineHeight": "20px",
  "minWidth": 180,
  "maxWidth": 500,
  "boxShadow": "0 4px 16px #05003812",
  "outline": "1px solid transparent",
  "variants": {
    "side": {
      "top": {
        "bottom": "100%"
      },
      "bottom": {
        "top": "100%"
      },
      "left": {
        "right": "100%"
      },
      "right": {
        "left": "100%"
      }
    }
  },
  "compoundVariants": [],
  "defaultVariants": {
    "side": "bottom"
  }
} as any,
);

// Source: shared/components/dropdown-menu/src/styles → group
export const Group = styled(
  "div",
  {
  "display": "block",
  "variants": {},
  "compoundVariants": [],
  "defaultVariants": {}
} as any,
);

// Source: shared/components/dropdown-menu/src/styles → item
export const Item = styled(
  "div",
  {
  "boxSizing": "border-box",
  "display": "grid",
  "gridTemplateColumns": "auto 1fr auto",
  "gridTemplateAreas": "\"left-slot item-text right-slot\"",
  "alignItems": "center",
  "gap": 8,
  "padding": "10px 8px",
  "fontSize": 14,
  "lineHeight": "20px",
  "color": "#222428",
  "borderRadius": 4,
  "position": "relative",
  "userSelect": "none",
  "cursor": "pointer",
  "outline": "none",
  "variants": {
    "highlighted": {
      "true": {
        "background": "#E8ECFC",
        "color": "#314CD9"
      },
      "false": {
        "background": "transparent"
      }
    },
    "disabled": {
      "true": {
        "color": "#AEB2C0",
        "cursor": "default",
        "pointerEvents": "none"
      },
      "false": {}
    }
  },
  "compoundVariants": [],
  "defaultVariants": {
    "highlighted": false,
    "disabled": false
  }
} as any,
);

// Source: shared/components/dropdown-menu/src/styles → label
export const Label = styled(
  "div",
  {
  "padding": "6px 8px",
  "fontSize": 12,
  "lineHeight": "16px",
  "fontWeight": 600,
  "color": "#AEB2C0",
  "variants": {},
  "compoundVariants": [],
  "defaultVariants": {}
} as any,
);

// Source: shared/components/dropdown-menu/src/styles → positioner
export const Positioner = styled(
  "div",
  {
  "position": "fixed",
  "width": 0,
  "height": 0,
  "variants": {
    "anchored": {
      "true": {
        "visibility": "visible"
      },
      "false": {
        "visibility": "hidden"
      }
    }
  },
  "compoundVariants": [],
  "defaultVariants": {
    "anchored": false
  }
} as any,
);

// Source: shared/components/dropdown-menu/src/styles → separator
export const Separator = styled(
  "div",
  {
  "height": 1,
  "marginY": 4,
  "marginX": 0,
  "background": "#E9EAEF",
  "variants": {},
  "compoundVariants": [],
  "defaultVariants": {}
} as any,
);
