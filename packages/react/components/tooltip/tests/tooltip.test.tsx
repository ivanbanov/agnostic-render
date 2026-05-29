/** @vitest-environment jsdom */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Tooltip, TooltipProvider } from "@render-experiment/tooltip-react";
import { tooltipStore } from "@render-experiment/tooltip-core";

/**
 * React DOM tests for the Tooltip component. Covers the behavioral
 * contract enumerated in packages/core/components/tooltip/SPEC.md.
 *
 * Notes:
 * - We use vitest fake timers throughout because tooltip behavior is
 *   delay-driven (openDelay, closeDelay, skipDelayDuration).
 * - The tooltip's keydown handler attaches to `document` in capture
 *   phase. `fireEvent.keyDown(document, {...})` is sufficient.
 * - Pointer events: `fireEvent.pointerMove(trigger)` is what the
 *   connect listens for. Focus is `act(() => trigger.focus())`.
 * - The global tooltipStore is a singleton across tests; we reset it
 *   in `beforeEach` so skip-delay windows don't leak.
 */

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  // Reset the shared skip-delay window between tests.
  tooltipStore.setOpen(null);
  tooltipStore.endSkipWindow();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

// -----------------------------------------------------------------------------
// state
// -----------------------------------------------------------------------------

describe("state", () => {
  it("opens by default when defaultOpen is true", () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("stays closed by default when defaultOpen is false", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("respects controlled `open` prop", () => {
    render(
      <Tooltip open>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("fires onOpenChange on open and close transitions", () => {
    const onOpenChange = vi.fn();
    render(
      <Tooltip onOpenChange={onOpenChange}>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    act(() => trigger.focus());
    expect(onOpenChange).toHaveBeenCalledWith({ open: true });

    act(() => trigger.blur());
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
  });
});

// -----------------------------------------------------------------------------
// hover + delay
// -----------------------------------------------------------------------------

describe("hover + delay", () => {
  it("opens on hover after the default openDelay (400ms)", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();

    advance(399);
    expect(screen.queryByRole("tooltip")).toBeNull();

    advance(1);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("honors a custom openDelay set on Root", () => {
    render(
      <Tooltip openDelay={1000}>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });

    advance(500);
    expect(screen.queryByRole("tooltip")).toBeNull();

    advance(500);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("does not open if pointer leaves before openDelay elapses", () => {
    render(
      <Tooltip openDelay={500}>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    advance(200);
    fireEvent.pointerLeave(trigger);
    advance(500);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

describe("Provider", () => {
  it("inherits openDelay from Provider", () => {
    render(
      <TooltipProvider openDelay={50}>
        <Tooltip>
          <Tooltip.Trigger>
            <button>Trigger</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Content</Tooltip.Content>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    advance(50);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("Root openDelay overrides Provider openDelay", () => {
    render(
      <TooltipProvider openDelay={1000}>
        <Tooltip openDelay={50}>
          <Tooltip.Trigger>
            <button>Trigger</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Content</Tooltip.Content>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    advance(50);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });
});

// -----------------------------------------------------------------------------
// focus
// -----------------------------------------------------------------------------

describe("focus", () => {
  it("opens on focus with no delay", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    act(() => trigger.focus());
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("closes on blur", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    act(() => trigger.focus());
    expect(screen.getByRole("tooltip")).toBeTruthy();

    act(() => trigger.blur());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// close
// -----------------------------------------------------------------------------

describe("close", () => {
  it("closes on Escape", () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    expect(screen.getByRole("tooltip")).toBeTruthy();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closeOnEscape={false} ignores Escape", () => {
    render(
      <Tooltip defaultOpen closeOnEscape={false}>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("onEscapeKeyDown.preventDefault keeps the tooltip open", () => {
    const onEscapeKeyDown = vi.fn((e) => {
      e.preventDefault();
    });
    render(
      <Tooltip defaultOpen onEscapeKeyDown={onEscapeKeyDown}>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(onEscapeKeyDown).toHaveBeenCalled();
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });
});

// -----------------------------------------------------------------------------
// ARIA + data-state
// -----------------------------------------------------------------------------

describe("ARIA", () => {
  it("trigger gets aria-describedby pointing at content while open", () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    const tooltip = screen.getByRole("tooltip");

    expect(trigger.getAttribute("aria-describedby")).toBe(
      tooltip.getAttribute("id"),
    );
  });

  it("trigger has no aria-describedby while closed", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    expect(trigger.getAttribute("aria-describedby")).toBe(null);
  });

  it("content has role=tooltip", () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });
});

describe("data attributes", () => {
  it("trigger and content reflect data-state=closed when closed", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByText("Trigger").getAttribute("data-state")).toBe(
      "closed",
    );
  });

  it("trigger reflects data-state=delayed-open after a hover open", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );
    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    advance(400);

    expect(trigger.getAttribute("data-state")).toBe("delayed-open");
    expect(screen.getByRole("tooltip").getAttribute("data-state")).toBe(
      "delayed-open",
    );
  });

  it("content reflects data-side", () => {
    render(
      <Tooltip defaultOpen positioning={{ placement: "right" }}>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    expect(screen.getByRole("tooltip").getAttribute("data-side")).toBe(
      "right",
    );
  });
});

// -----------------------------------------------------------------------------
// skip-delay
// -----------------------------------------------------------------------------

describe("skip-delay", () => {
  it("second tooltip opens instantly within the skip-delay window", () => {
    render(
      <>
        <Tooltip>
          <Tooltip.Trigger>
            <button>T1</button>
          </Tooltip.Trigger>
          <Tooltip.Content>First</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>
            <button>T2</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Second</Tooltip.Content>
        </Tooltip>
      </>,
    );

    // Open the first tooltip (pay full openDelay).
    const t1 = screen.getByText("T1");
    fireEvent.pointerMove(t1, { pointerType: "mouse" });
    advance(400);
    expect(screen.getByText("First")).toBeTruthy();

    // Close it.
    fireEvent.pointerLeave(t1);
    advance(150); // closeDelay

    // Within the skip-delay window, hovering T2 opens instantly.
    const t2 = screen.getByText("T2");
    fireEvent.pointerMove(t2, { pointerType: "mouse" });
    expect(screen.getByText("Second")).toBeTruthy();
    expect(t2.getAttribute("data-state")).toBe("instant-open");
  });

  it("skipDelayDuration={0} disables instant-open entirely", () => {
    render(
      <TooltipProvider skipDelayDuration={0}>
        <Tooltip>
          <Tooltip.Trigger>
            <button>T1</button>
          </Tooltip.Trigger>
          <Tooltip.Content>First</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>
            <button>T2</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Second</Tooltip.Content>
        </Tooltip>
      </TooltipProvider>,
    );

    const t1 = screen.getByText("T1");
    fireEvent.pointerMove(t1, { pointerType: "mouse" });
    advance(400);
    fireEvent.pointerLeave(t1);
    advance(150);

    const t2 = screen.getByText("T2");
    fireEvent.pointerMove(t2, { pointerType: "mouse" });
    expect(screen.queryByText("Second")).toBeNull();

    advance(400);
    expect(screen.getByText("Second")).toBeTruthy();
    expect(t2.getAttribute("data-state")).toBe("delayed-open");
  });
});

// -----------------------------------------------------------------------------
// disabled
// -----------------------------------------------------------------------------

describe("disabled", () => {
  it("suppresses opens", () => {
    render(
      <Tooltip disabled>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    advance(1000);
    act(() => trigger.focus());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("emits aria-disabled and data-disabled on the trigger", () => {
    render(
      <Tooltip disabled>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    expect(trigger.hasAttribute("data-disabled")).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// hoverable content
// -----------------------------------------------------------------------------

describe("hoverable content", () => {
  it("by default, tooltip stays open while pointer is on content", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    advance(400);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    // Leave trigger; pointer enters content.
    fireEvent.pointerLeave(trigger);
    const content = screen.getByRole("tooltip");
    fireEvent.pointerEnter(content);

    // Wait past the closeDelay — content kept it open.
    advance(150);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("disableHoverableContent closes when pointer leaves trigger", () => {
    render(
      <Tooltip disableHoverableContent>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    );

    const trigger = screen.getByText("Trigger");
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    advance(400);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    fireEvent.pointerLeave(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
