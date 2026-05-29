import { describe, expect, it } from "vitest";
import { shallowEqual } from "../shallow-equal";

describe("shallowEqual", () => {
  describe("primitives", () => {
    it("returns true for identical primitives", () => {
      expect(shallowEqual(1, 1)).toBe(true);
      expect(shallowEqual("a", "a")).toBe(true);
      expect(shallowEqual(true, true)).toBe(true);
      expect(shallowEqual(null, null)).toBe(true);
      expect(shallowEqual(undefined, undefined)).toBe(true);
    });

    it("returns false for different primitives", () => {
      expect(shallowEqual(1, 2)).toBe(false);
      expect(shallowEqual("a", "b")).toBe(false);
      expect(shallowEqual(true, false)).toBe(false);
    });

    it("handles NaN correctly (Object.is semantics)", () => {
      expect(shallowEqual(NaN, NaN)).toBe(true);
    });

    it("distinguishes +0 and -0 (Object.is semantics)", () => {
      expect(shallowEqual(0, -0)).toBe(false);
    });
  });

  describe("objects", () => {
    it("returns true for same reference", () => {
      const obj = { a: 1 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });

    it("returns true for objects with same keys and values", () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it("returns false for objects with different keys", () => {
      expect(
        shallowEqual({ a: 1 } as unknown as { x: number }, {
          b: 1,
        } as unknown as { x: number }),
      ).toBe(false);
    });

    it("returns false for objects with different values", () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("returns false for objects with different number of keys", () => {
      expect(shallowEqual({ a: 1 } as { a: number; b?: number }, { a: 1, b: 2 })).toBe(false);
    });

    it("does not deep compare nested objects", () => {
      const nested1 = { inner: 1 };
      const nested2 = { inner: 1 };
      expect(shallowEqual({ a: nested1 }, { a: nested2 })).toBe(false);
    });

    it("returns true for nested objects with same reference", () => {
      const nested = { inner: 1 };
      expect(shallowEqual({ a: nested }, { a: nested })).toBe(true);
    });
  });

  describe("arrays", () => {
    it("returns true for same reference", () => {
      const arr = [1, 2, 3];
      expect(shallowEqual(arr, arr)).toBe(true);
    });

    it("returns true for arrays with same elements", () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it("returns false for arrays with different elements", () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("returns false for arrays with different lengths", () => {
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false when comparing object to null", () => {
      expect(shallowEqual({ a: 1 }, null as unknown as { a: number })).toBe(false);
      expect(shallowEqual(null as unknown as { a: number }, { a: 1 })).toBe(false);
    });

    it("returns false when comparing object to primitive", () => {
      expect(shallowEqual({ a: 1 } as unknown as number, 1)).toBe(false);
      expect(shallowEqual(1 as unknown as { a: number }, { a: 1 })).toBe(false);
    });

    it("handles empty objects", () => {
      expect(shallowEqual({}, {})).toBe(true);
    });

    it("handles empty arrays", () => {
      expect(shallowEqual([], [])).toBe(true);
    });
  });
});
