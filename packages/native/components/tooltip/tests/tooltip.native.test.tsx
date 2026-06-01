/**
 * React Native substrate tests for the Tooltip view.
 *
 * These assert the RN-specific behaviors the SPEC + render.tsx call out,
 * which the web tests can't cover:
 *   - Long-press opens (no hover model on RN).
 *   - Press-out closes (hold-to-show touch idiom).
 *   - Content renders inline only while open (no portal in v1).
 *   - Trigger carries RN accessibility props (via the native normalizer).
 *   - Android hardware back closes an open tooltip (BackHandler).
 *
 * The shared state-machine contract (delays, mutual exclusion, etc.) is
 * covered framework-free in core/components/tooltip/tests/machine.test.ts;
 * here we only verify the RN view wires that machine up correctly.
 */
import { BackHandler } from "react-native";
import { Text } from "react-native";
import {
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react-native";
import { Tooltip } from "@render-experiment/tooltip-native";

function renderTooltip(rootProps = {}) {
  return render(
    <Tooltip {...rootProps}>
      <Tooltip.Trigger>
        <Text>trigger</Text>
      </Tooltip.Trigger>
      <Tooltip.Content>hello</Tooltip.Content>
    </Tooltip>,
  );
}

describe("RN tooltip — open/close model", () => {
  it("is closed initially (content not rendered)", () => {
    renderTooltip();
    expect(screen.queryByText("hello")).toBeNull();
  });

  it("opens on long-press (RN has no hover)", () => {
    renderTooltip();
    fireEvent(screen.getByText("trigger"), "longPress");
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("closes on press-out (hold-to-show idiom)", () => {
    renderTooltip();
    const trigger = screen.getByText("trigger");
    fireEvent(trigger, "longPress");
    expect(screen.getByText("hello")).toBeTruthy();

    fireEvent(trigger, "pressOut");
    expect(screen.queryByText("hello")).toBeNull();
  });

  it("respects defaultOpen", () => {
    renderTooltip({ defaultOpen: true });
    expect(screen.getByText("hello")).toBeTruthy();
  });
});

describe("RN tooltip — handler wiring on the trigger", () => {
  it("wires RN long-press (proven by behavior) and never web hover/key handlers", () => {
    renderTooltip();

    // Find the Pressable host that actually carries the press wiring by
    // walking the rendered tree (the consumer's <Text> is nested inside it).
    const root = screen.UNSAFE_root;
    const withLongPress = root.findAll(
      (node: { props?: Record<string, unknown> }) =>
        typeof node.props?.onLongPress === "function",
    );
    expect(withLongPress.length).toBeGreaterThan(0);

    // The native normalizer must never leak DOM-only handlers onto any host.
    const webHandlers = root.findAll(
      (node: { props?: Record<string, unknown> }) =>
        node.props?.onPointerMove !== undefined ||
        node.props?.onKeyDown !== undefined ||
        node.props?.onPointerEnter !== undefined,
    );
    expect(webHandlers).toHaveLength(0);
  });
});

describe("RN tooltip — Android back button", () => {
  it("closes the open tooltip on hardware back press", () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    renderTooltip({ defaultOpen: true });
    expect(screen.getByText("hello")).toBeTruthy();

    // Grab the handler the Content registered and invoke it.
    const call = spy.mock.calls.find(
      ([event]: [string, ...unknown[]]) => event === "hardwareBackPress",
    );
    expect(call).toBeTruthy();
    const handler = call![1] as () => boolean;

    let handled = false;
    act(() => {
      handled = handler();
    });
    expect(handled).toBe(true); // consumed the back press
    expect(screen.queryByText("hello")).toBeNull();

    spy.mockRestore();
  });
});
