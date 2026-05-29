/** @vitest-environment jsdom */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DropdownMenu } from "@render-experiment/dropdown-menu-react";
import { dropdownMenuStore } from "@render-experiment/dropdown-menu-core";

/**
 * Positioning + viewport-visibility behaviors from SPEC.md.
 *
 * Mirrors tooltip/positioning.test.tsx — jsdom lacks ResizeObserver and
 * IntersectionObserver, so we install manual-fire stubs the tests drive
 * directly. getBoundingClientRect is patched per-element.
 */

// -----------------------------------------------------------------------------
// observer stubs — manually fire from tests
// -----------------------------------------------------------------------------

interface FakeResizeRecord {
  target: Element;
}
type ResizeCb = (entries: FakeResizeRecord[]) => void;

interface FakeIntersectRecord {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
}
type IntersectCb = (entries: FakeIntersectRecord[]) => void;

const resizeObservers: { cb: ResizeCb; targets: Element[] }[] = [];
const intersectObservers: { cb: IntersectCb; targets: Element[] }[] = [];

class FakeResizeObserver {
  private cb: ResizeCb;
  private targets: Element[] = [];
  constructor(cb: ResizeCb) {
    this.cb = cb;
    resizeObservers.push({ cb, targets: this.targets });
  }
  observe(t: Element): void {
    this.targets.push(t);
  }
  unobserve(): void {}
  disconnect(): void {}
}

class FakeIntersectionObserver {
  private cb: IntersectCb;
  private targets: Element[] = [];
  constructor(cb: IntersectCb) {
    this.cb = cb;
    intersectObservers.push({ cb, targets: this.targets });
  }
  observe(t: Element): void {
    this.targets.push(t);
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): FakeIntersectRecord[] {
    return [];
  }
}

const fireResize = (target: Element) => {
  for (const o of resizeObservers) {
    if (o.targets.includes(target)) {
      act(() => o.cb([{ target }]));
    }
  }
};

const fireIntersection = (target: Element, isIntersecting: boolean) => {
  for (const o of intersectObservers) {
    if (o.targets.includes(target)) {
      act(() =>
        o.cb([
          {
            target,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
          },
        ]),
      );
    }
  }
};

function stubRect(
  el: Element,
  rect: { top: number; left: number; width: number; height: number },
) {
  el.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => "",
    } as DOMRect);
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

beforeEach(() => {
  dropdownMenuStore.setOpen(null);
  resizeObservers.length = 0;
  intersectObservers.length = 0;
  // @ts-expect-error -- install stub
  globalThis.ResizeObserver = FakeResizeObserver;
  // @ts-expect-error -- install stub
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  setViewport(1000, 800);
});

afterEach(() => {
  cleanup();
});

// -----------------------------------------------------------------------------
// SPEC: "When the preferred side would clip, the renderer flips to the
//        opposite side."
// -----------------------------------------------------------------------------

describe("collision — side flips when clipped", () => {
  it("flips bottom → top when there's no room below the trigger", () => {
    render(
      <DropdownMenu defaultOpen positioning={{ placement: "bottom" }}>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    stubRect(trigger, { top: 780, left: 100, width: 80, height: 16 });

    const content = screen.getByRole("menu");
    stubRect(content, { top: 0, left: 0, width: 200, height: 200 });

    fireEvent.scroll(window);

    expect(content.getAttribute("data-side")).toBe("top");
  });

  it("flips right → left when there's no room to the right", () => {
    render(
      <DropdownMenu defaultOpen positioning={{ placement: "right" }}>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    stubRect(trigger, { top: 100, left: 920, width: 60, height: 30 });

    const content = screen.getByRole("menu");
    stubRect(content, { top: 0, left: 0, width: 200, height: 100 });

    fireEvent.scroll(window);

    expect(content.getAttribute("data-side")).toBe("left");
  });

  it("keeps the preferred side when it fits", () => {
    render(
      <DropdownMenu defaultOpen positioning={{ placement: "bottom" }}>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    stubRect(trigger, { top: 100, left: 100, width: 80, height: 16 });

    const content = screen.getByRole("menu");
    stubRect(content, { top: 0, left: 0, width: 200, height: 100 });

    fireEvent.scroll(window);

    expect(content.getAttribute("data-side")).toBe("bottom");
  });
});

// -----------------------------------------------------------------------------
// SPEC: "Position is recomputed when the trigger moves, the window resizes,
//        or the surrounding content scrolls."
// -----------------------------------------------------------------------------

describe("trigger move — recompute on resize", () => {
  it("recomputes side when the trigger's ResizeObserver fires", () => {
    render(
      <DropdownMenu defaultOpen positioning={{ placement: "bottom" }}>
        <DropdownMenu.Trigger>
          <button>Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item value="a">A</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );

    const trigger = screen.getByText("Open");
    stubRect(trigger, { top: 100, left: 100, width: 80, height: 16 });
    const content = screen.getByRole("menu");
    stubRect(content, { top: 0, left: 0, width: 200, height: 100 });

    fireEvent.scroll(window);
    expect(content.getAttribute("data-side")).toBe("bottom");

    // Trigger moves to the bottom of the viewport.
    stubRect(trigger, { top: 780, left: 100, width: 80, height: 16 });
    fireResize(trigger);

    expect(content.getAttribute("data-side")).toBe("top");
  });
});

// -----------------------------------------------------------------------------
// SPEC: "If the trigger leaves the viewport, the menu dismisses."
// -----------------------------------------------------------------------------

describe("viewport visibility — dismiss when trigger leaves", () => {
  it("closes when the trigger's IntersectionObserver reports out-of-view", () => {
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

    const trigger = screen.getByText("Open");
    expect(screen.getByRole("menu")).toBeTruthy();

    fireIntersection(trigger, false);

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("stays open while the trigger remains in view", () => {
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

    const trigger = screen.getByText("Open");
    fireIntersection(trigger, true);

    expect(screen.getByRole("menu")).toBeTruthy();
  });
});
