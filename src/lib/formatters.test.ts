import { describe, it, expect } from "vitest";
import { formatBytes, formatSpeed, formatDuration, formatEta } from "./formatters";

describe("formatBytes", () => {
  it("handles missing/zero", () => {
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(0)).toBe("0 B");
  });
  it("scales units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1_500_000)).toBe("1.4 MB");
    expect(formatBytes(312_000_000)).toBe("297.5 MB");
  });
});

describe("formatSpeed", () => {
  it("appends /s", () => {
    expect(formatSpeed(4_200_000)).toBe("4.0 MB/s");
    expect(formatSpeed(undefined)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(752)).toBe("12:32");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(undefined)).toBe("—");
  });
});

describe("formatEta", () => {
  it("switches from seconds to minutes", () => {
    expect(formatEta(18)).toBe("~18s remaining");
    expect(formatEta(120)).toBe("~2m remaining");
    expect(formatEta(undefined)).toBe("—");
  });
});
