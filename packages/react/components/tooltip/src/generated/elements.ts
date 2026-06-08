/* eslint-disable */
import { styled } from "@render-experiment/style-engine-react";

// Source: shared/components/tooltip/src/styles → content
export const Content = styled(
  "div",
  {
  "position": "absolute",
  "pointerEvents": "auto",
  "background": "#191a1c",
  "color": "#ffffff",
  "paddingTop": 6,
  "paddingBottom": 6,
  "paddingLeft": 8,
  "paddingRight": 8,
  "borderRadius": 3,
  "fontSize": 14,
  "fontWeight": 400,
  "lineHeight": "20px",
  "fontFamily": "inherit",
  "outline": "1px solid transparent",
  "zIndex": 2147483647,
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

// Source: shared/components/tooltip/src/styles → positioner
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
