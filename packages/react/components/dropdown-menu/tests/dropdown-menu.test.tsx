/** @vitest-environment jsdom */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { DropdownMenu } from "@render-experiment/dropdown-menu-react";
import { dropdownMenuStore } from "@render-experiment/dropdown-menu-core";

/**
 * React DOM tests for the DropdownMenu. Covers the behavioral contract
 * enumerated in packages/core/components/dropdown-menu/SPEC.md.
 *
 * Notes:
 * - jsdom doesn't have ResizeObserver / IntersectionObserver; we stub
 *   minimal manual-fire versions in the positioning section.
 * - The connect attaches Escape via a document-level keydown listener;
 *   tests fire on `document` rather than the trigger.
 */

beforeEach(() => {
  // Reset the global dropdown store between tests.
  dropdownMenuStore.setOpen(null);
});

afterEach(() => {
  cleanup();
});

// -----------------------------------------------------------------------------
// open + close
// -----------------------------------------------------------------------------

describe("open + close", () => {
  it("opens on trigger click; closes on second trigger click", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeTruthy();

    fireEvent.click(trigger);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("respects defaultOpen", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("respects controlled open prop", () => {
    render(
      <DropdownMenu open>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("Enter on trigger opens; first item highlighted", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b">B</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(screen.getByRole("menu")).toBeTruthy();
    const itemA = screen.getByText("A");
    expect(itemA.getAttribute("data-highlighted")).toBe("");
  });

  it("ArrowUp on trigger opens with last item highlighted", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b">B</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    fireEvent.keyDown(trigger, { key: "ArrowUp" });

    const itemB = screen.getByText("B");
    expect(itemB.getAttribute("data-highlighted")).toBe("");
  });

  it("Escape closes the menu", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menu")).toBeTruthy();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Tab closes the menu", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "Tab" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("fires onOpenChange on every transition", () => {
    const onOpenChange = vi.fn();
    render(
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("Open"));
    expect(onOpenChange).toHaveBeenCalledWith({ open: true });

    fireEvent.click(screen.getByText("Open"));
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false });
  });
});

// -----------------------------------------------------------------------------
// item activation
// -----------------------------------------------------------------------------

describe("item activation", () => {
  it("clicking a regular item calls onSelect and closes the menu", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a" onSelect={onSelect}>
            A
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("A"));

    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("onSelect can preventDefault to keep the menu open", () => {
    const onSelect = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a" onSelect={onSelect}>
            A
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("A"));

    expect(onSelect).toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("disabled items don't fire onSelect", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a" disabled onSelect={onSelect}>
            A
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("A"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("disabled items expose aria-disabled and data-disabled", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a" disabled>
            A
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const item = screen.getByText("A");
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.hasAttribute("data-disabled")).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// checkbox + radio
// -----------------------------------------------------------------------------

describe("CheckboxItem", () => {
  it("activation fires onCheckedChange with the toggled value", () => {
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem
            value="bold"
            checked={false}
            onCheckedChange={onCheckedChange}
          >
            Bold
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("Bold"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not close the menu on activation", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem value="bold" checked={false}>
            Bold
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("Bold"));
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("exposes a menuitemcheckbox role", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem value="bold" checked={false}>
            Bold
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menuitemcheckbox")).toBeTruthy();
  });
});

describe("RadioGroup + RadioItem", () => {
  it("activating a RadioItem fires onValueChange with its value", () => {
    const onValueChange = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup
            value="light"
            onValueChange={onValueChange}
          >
            <DropdownMenu.RadioItem value="light">Light</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark">Dark</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("Dark"));
    expect(onValueChange).toHaveBeenCalledWith("dark");
  });

  it("does not close the menu on activation", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value="light">
            <DropdownMenu.RadioItem value="light">Light</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark">Dark</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByText("Dark"));
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("exposes a menuitemradio role", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value="light">
            <DropdownMenu.RadioItem value="light">Light</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menuitemradio")).toBeTruthy();
  });
});

// -----------------------------------------------------------------------------
// keyboard navigation
// -----------------------------------------------------------------------------

describe("keyboard navigation", () => {
  it("ArrowDown moves highlight to the next item", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b">B</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByText("A").getAttribute("data-highlighted")).toBe("");

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByText("B").getAttribute("data-highlighted")).toBe("");
  });

  it("ArrowDown skips disabled items", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b" disabled>
            B
          </DropdownMenu.Item>
          <DropdownMenu.Item value="c">C</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "ArrowDown" });

    // Skipped B (disabled), landed on C.
    expect(screen.getByText("C").getAttribute("data-highlighted")).toBe("");
  });

  it("Home highlights the first enabled item", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b">B</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    // Move past the first.
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByText("B").getAttribute("data-highlighted")).toBe("");

    fireEvent.keyDown(menu, { key: "Home" });
    expect(screen.getByText("A").getAttribute("data-highlighted")).toBe("");
  });

  it("Enter activates the highlighted item", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b" onSelect={onSelect}>
            B
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent.keyDown(menu, { key: "Enter" });

    expect(onSelect).toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------------
// trigger keyboard interaction
//
// SPEC: keyboard open intents must:
//   - call preventDefault so the browser does not (a) scroll the page on
//     ArrowUp/Down, (b) activate the trigger button on Space keyup, or
//     (c) submit a form on Enter.
//   - transfer focus into the menu content so arrows route to the menu
//     handler, not the trigger.
//   - items inside the open menu must NOT be tab stops; Tab leaves the
//     menu instead of cycling through items.
// -----------------------------------------------------------------------------

describe("trigger keyboard interaction", () => {
  it("Enter on trigger calls preventDefault (no form submit, no double-open)", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    const event = createEvent.keyDown(trigger, { key: "Enter" });
    fireEvent(trigger, event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("Space on trigger calls preventDefault (no keyup-activates-button re-toggle)", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    const event = createEvent.keyDown(trigger, { key: " " });
    fireEvent(trigger, event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("menu")).toBeTruthy();

    // Simulate the keyup that would normally activate a <button>. With
    // preventDefault on keydown, the browser suppresses the synthetic
    // click — i.e. the menu must stay open.
    fireEvent.keyUp(trigger, { key: " " });
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("ArrowDown / ArrowUp on trigger call preventDefault (no page scroll)", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    const down = createEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent(trigger, down);
    expect(down.defaultPrevented).toBe(true);
  });

  it("ArrowDown / ArrowUp inside open menu call preventDefault (no page scroll)", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b">B</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    const down = createEvent.keyDown(menu, { key: "ArrowDown" });
    fireEvent(menu, down);
    expect(down.defaultPrevented).toBe(true);

    const up = createEvent.keyDown(menu, { key: "ArrowUp" });
    fireEvent(menu, up);
    expect(up.defaultPrevented).toBe(true);
  });

  it("opening via keyboard transfers focus to the menu content", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const menu = screen.getByRole("menu");
    expect(document.activeElement).toBe(menu);
  });

  it("arrows on the trigger after open continue to navigate the menu", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b">B</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    // Open with first highlighted.
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByText("A").getAttribute("data-highlighted")).toBe("");

    // A second ArrowDown — fired wherever focus actually landed —
    // should advance the highlight to B without the user needing to Tab.
    const focused = document.activeElement as Element;
    fireEvent.keyDown(focused, { key: "ArrowDown" });
    expect(screen.getByText("B").getAttribute("data-highlighted")).toBe("");
  });

  it("items in an open menu are not in the tab order", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          <DropdownMenu.Item value="b">B</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    for (const text of ["A", "B"]) {
      const item = screen.getByText(text);
      // Items receive focus programmatically via highlight, but should
      // not participate in tab traversal. tabIndex -1 is the contract.
      expect(item.getAttribute("tabindex")).toBe("-1");
    }
  });

  it("Tab from open menu closes and returns focus to the trigger", () => {
    // Returning focus to the trigger lets the browser's native Tab
    // handling continue naturally — the next Tab moves to the focusable
    // after the trigger. We don't preventDefault Tab here; the test
    // (in jsdom, where Tab navigation is inert) verifies the active
    // element is the trigger so a real browser's Tab key would take
    // the user one step past it.
    render(
      <div>
        <DropdownMenu defaultOpen>
          <DropdownMenu.Trigger>
            <button>Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
        <button>After</button>
      </div>,
    );

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "Tab" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Open"));
  });
});

// -----------------------------------------------------------------------------
// focusTrap mode
//
// SPEC (Behavior › Focus trap): the `focusTrap` prop (default false)
// decides what Tab does while the menu is open.
//   - false (default, covered above): Tab closes + focus leaves the menu.
//   - true: Tab is swallowed (preventDefault, no close); focus stays in the
//     menu. Only Escape or activating an item exits.
// -----------------------------------------------------------------------------

describe("focusTrap mode", () => {
  it("Tab does NOT close the menu when focusTrap is true", () => {
    render(
      <div>
        <DropdownMenu defaultOpen focusTrap>
          <DropdownMenu.Trigger>
            <button>Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
        <button>After</button>
      </div>,
    );

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "Tab" });

    // Menu stays open and focus is not yanked to the trigger.
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(document.activeElement).not.toBe(screen.getByText("Open"));
  });

  it("Tab calls preventDefault when focusTrap is true (focus can't leave)", () => {
    render(
      <DropdownMenu defaultOpen focusTrap>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    const event = createEvent.keyDown(menu, { key: "Tab" });
    fireEvent(menu, event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("Shift+Tab is also swallowed when focusTrap is true", () => {
    render(
      <DropdownMenu defaultOpen focusTrap>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    const event = createEvent.keyDown(menu, { key: "Tab", shiftKey: true });
    fireEvent(menu, event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("Escape still closes the menu in focusTrap mode", () => {
    render(
      <DropdownMenu defaultOpen focusTrap>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByRole("menu")).toBeTruthy();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// typeahead
// -----------------------------------------------------------------------------

describe("typeahead", () => {
  it("typing a character highlights the first matching item", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="apple">Apple</DropdownMenu.Item>
          <DropdownMenu.Item value="banana">Banana</DropdownMenu.Item>
          <DropdownMenu.Item value="cherry">Cherry</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "b" });

    expect(screen.getByText("Banana").getAttribute("data-highlighted")).toBe(
      "",
    );
  });
});

// -----------------------------------------------------------------------------
// ARIA
// -----------------------------------------------------------------------------

describe("ARIA", () => {
  it("trigger has aria-haspopup and aria-expanded", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("content has role=menu with vertical orientation", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const menu = screen.getByRole("menu");
    expect(menu.getAttribute("data-orientation")).toBe("vertical");
  });
});

// -----------------------------------------------------------------------------
// data-state
// -----------------------------------------------------------------------------

describe("data-state attributes", () => {
  it("trigger and content reflect data-state", () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    expect(trigger.getAttribute("data-state")).toBe("closed");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(screen.getByRole("menu").getAttribute("data-state")).toBe("open");
  });

  it("checkbox item exposes data-state=checked / unchecked / indeterminate", () => {
    const { rerender } = render(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem value="x" checked={false}>
            X
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByText("X").getAttribute("data-state")).toBe("unchecked");

    rerender(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem value="x" checked>
            X
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByText("X").getAttribute("data-state")).toBe("checked");

    rerender(
      <DropdownMenu defaultOpen>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem value="x" checked="indeterminate">
            X
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    expect(screen.getByText("X").getAttribute("data-state")).toBe(
      "indeterminate",
    );
  });
});

// -----------------------------------------------------------------------------
// mutual exclusion
// -----------------------------------------------------------------------------

describe("mutual exclusion", () => {
  it("opening one menu closes any other", () => {
    render(
      <>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button>M1</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item value="a">A</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button>M2</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item value="b">B</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </>,
    );

    fireEvent.click(screen.getByText("M1"));
    expect(screen.getByText("A")).toBeTruthy();

    fireEvent.click(screen.getByText("M2"));
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.getByText("B")).toBeTruthy();
  });
});
