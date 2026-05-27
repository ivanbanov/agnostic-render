/**
 * Logical event + attribute vocabulary for behavior connect() outputs.
 *
 * This is the substrate-agnostic vocabulary every component's behavior
 * speaks. The connect() returned by a behavior produces `LogicalHandlers`
 * and `LogicalAttrs`; each renderer's adapter translates them:
 *
 *   React DOM   : behavior-react/normalize-props
 *   React Native: behavior-rn/normalize-props (future)
 *   Surface     : behavior-surface/normalize-props (future)
 *
 * The event payload types below pin the fields a handler can rely on
 * across substrates. They are intentionally minimal — anything substrate-
 * specific (clientX, nativeEvent, currentTarget) lives behind the adapter
 * and is invisible to component authors.
 */

// -----------------------------------------------------------------------------
// Event payloads
// -----------------------------------------------------------------------------

export interface LogicalPointerEvent {
  /** True when an upstream handler called preventDefault / equivalent. */
  defaultPrevented?: boolean;
  /** Pointer button number. 0 is primary on every substrate. */
  button?: number;
  /** Input modality. Canvas/RN can supply "touch" or "mouse"; web supplies all three. */
  pointerType?: "mouse" | "touch" | "pen";
}

export interface LogicalKeyboardEvent {
  defaultPrevented?: boolean;
  /** Logical key name. Matches `KeyboardEvent.key` on web. */
  key?: string;
}

// -----------------------------------------------------------------------------
// Handler shape
// -----------------------------------------------------------------------------

export interface LogicalHandlers {
  /** "user clicked / tapped / activated this thing." */
  onPress?: (event?: LogicalPointerEvent) => void;

  onPointerEnter?: (event?: LogicalPointerEvent) => void;
  onPointerLeave?: (event?: LogicalPointerEvent) => void;
  onPointerMove?: (event?: LogicalPointerEvent) => void;
  onPointerDown?: (event?: LogicalPointerEvent) => void;
  onPointerUp?: (event?: LogicalPointerEvent) => void;
  onPointerCancel?: (event?: LogicalPointerEvent) => void;

  onFocus?: () => void;
  onBlur?: () => void;

  onKeyDown?: (event?: LogicalKeyboardEvent) => void;
  onKeyUp?: (event?: LogicalKeyboardEvent) => void;
}

// -----------------------------------------------------------------------------
// Attribute shape
// -----------------------------------------------------------------------------

export interface LogicalAttrs {
  id?: string;

  /** "this element's description is over there" (ARIA describedby). */
  describedBy?: string;
  /** "this element's label is over there" (ARIA labelledby). */
  labelledBy?: string;

  /** Boolean state (open/closed disclosure regions). */
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  hidden?: boolean;

  /**
   * Whether the element participates in keyboard focus.
   * Adapters map to `tabIndex` (web) / `accessible` (RN) / etc.
   */
  focusable?: boolean;

  /** ARIA role on web; equivalent semantic tag on other substrates. */
  role?: string;
}
