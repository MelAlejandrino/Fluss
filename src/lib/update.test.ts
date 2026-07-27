import { describe, it, expect } from "vitest";
import { isNewer } from "./update";

describe("isNewer", () => {
  it("detects a higher version", () => {
    expect(isNewer("0.2.0", "0.1.0")).toBe(true);
    expect(isNewer("1.0.0", "0.9.9")).toBe(true);
    expect(isNewer("0.1.1", "0.1.0")).toBe(true);
  });
  it("is false for same or older", () => {
    expect(isNewer("0.1.0", "0.1.0")).toBe(false);
    expect(isNewer("0.1.0", "0.2.0")).toBe(false);
    expect(isNewer("1.0.0", "1.0.1")).toBe(false);
  });
  it("handles uneven lengths", () => {
    expect(isNewer("0.2", "0.1.9")).toBe(true);
    expect(isNewer("0.1", "0.1.0")).toBe(false);
  });
});
