import { describe, expect, it } from "vitest";
import { resetScrollTop } from "./scroll";

describe("resetScrollTop", () => {
  it("sets scrollTop to zero", () => {
    const element = { scrollTop: 480 } as HTMLElement;
    resetScrollTop(element);
    expect(element.scrollTop).toBe(0);
  });

  it("ignores null and undefined", () => {
    expect(() => resetScrollTop(null)).not.toThrow();
    expect(() => resetScrollTop(undefined)).not.toThrow();
  });
});
