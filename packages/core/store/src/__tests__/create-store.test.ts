import { describe, expect, it, vi } from "vitest";
import { createStore } from "../create-store";

describe("createStore", () => {
  describe("initialization", () => {
    it("creates a store with the given initial state", () => {
      const store = createStore({ count: 0, name: "test" });
      expect(store.getState()).toEqual({ count: 0, name: "test" });
    });

    it("creates a store with empty object when no initial state provided", () => {
      const store = createStore();
      expect(store.getState()).toEqual({});
    });

    it("returns the initial state via getInitialState", () => {
      const initial = { count: 5 };
      const store = createStore(initial);
      store.setState({ count: 10 });
      expect(store.getInitialState()).toEqual({ count: 5 });
      expect(store.getState()).toEqual({ count: 10 });
    });
  });

  describe("setState", () => {
    it("updates state with partial object (merge)", () => {
      const store = createStore({ count: 0, name: "test" });
      store.setState({ count: 5 });
      expect(store.getState()).toEqual({ count: 5, name: "test" });
    });

    it("replaces entire state when replace=true", () => {
      const store = createStore({ count: 0, name: "test" });
      store.setState({ count: 5 } as { count: number; name: string }, true);
      expect(store.getState()).toEqual({ count: 5 });
    });

    it("accepts updater function", () => {
      const store = createStore({ count: 0 });
      store.setState((state) => ({ count: state.count + 1 }));
      expect(store.getState()).toEqual({ count: 1 });
    });

    it("notifies all subscribers on state change", () => {
      const store = createStore({ count: 0 });
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);
      store.setState({ count: 1 });

      expect(listener1).toHaveBeenCalledWith({ count: 1 });
      expect(listener2).toHaveBeenCalledWith({ count: 1 });
    });

    it("partial merge always produces a new object → still notifies", () => {
      // Spreading {...state, ...partial} returns a fresh reference, so the
      // Object.is short-circuit never kicks in for merges, even when the
      // partial is value-identical.
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      store.setState({ count: 0 });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("skips notification when the same state reference is passed back", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      // Passing the exact existing state object with replace=true is a
      // no-op; setState should detect that and skip notification.
      store.setState(store.getState(), true);

      expect(listener).not.toHaveBeenCalled();
    });

    it("skips notification when updater returns the same reference", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      store.setState((prev) => prev, true);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("setStateSilent", () => {
    it("updates state without notifying subscribers", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      store.setStateSilent({ count: 1 });

      expect(store.getState()).toEqual({ count: 1 });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("returns unsubscribe function", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      store.setState({ count: 1 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      store.setState({ count: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("supports multiple subscribers", () => {
      const store = createStore({ count: 0 });
      const listeners = [vi.fn(), vi.fn(), vi.fn()];

      listeners.forEach((l) => store.subscribe(l));
      store.setState({ count: 1 });

      listeners.forEach((l) => {
        expect(l).toHaveBeenCalledTimes(1);
        expect(l).toHaveBeenCalledWith({ count: 1 });
      });
    });
  });

  describe("destroy", () => {
    it("clears all subscribers", () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      store.destroy();
      store.setState({ count: 1 });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
