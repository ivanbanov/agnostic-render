/* eslint-disable */
import { styled } from "@render-experiment/style-engine-native/styled";

// Source: shared/components/tooltip/src/styles → content
export const Content = styled("View", {
  "position": "absolute",
  "backgroundColor": "#191a1c",
  "color": "#ffffff",
  "paddingVertical": 6,
  "paddingHorizontal": 8,
  "borderRadius": 3,
  "fontSize": 14,
  "fontWeight": 400,
  "lineHeight": 20,
  "fontFamily": "inherit",
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
  "defaultVariants": {
    "side": "bottom"
  }
} as any);

// Source: shared/components/tooltip/src/styles → positioner
export const Positioner = styled("View", {
  "position": "absolute",
  "width": 0,
  "height": 0,
  "variants": {
    "anchored": {
      "true": {},
      "false": {}
    }
  },
  "defaultVariants": {
    "anchored": false
  }
} as any);
