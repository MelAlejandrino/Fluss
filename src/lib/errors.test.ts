import { describe, it, expect } from "vitest";
import {
  friendlyError,
  errorDetails,
  NO_OUTPUT_DIR,
  NO_WRITE_PERMISSION,
  TIMED_OUT,
  ANALYZE_FALLBACK,
} from "./errors";

describe("friendlyError", () => {
  it("maps the sentinels the Rust side returns", () => {
    expect(friendlyError(NO_OUTPUT_DIR)).toMatch(/no longer exists/);
    expect(friendlyError(NO_WRITE_PERMISSION)).toMatch(/can't write/);
  });

  it("maps real yt-dlp failures to actionable text", () => {
    const cases: [string, RegExp][] = [
      ["ERROR: [youtube] xyz: Private video. Sign in if you've been granted access", /private/i],
      ["ERROR: [youtube] xyz: Video unavailable", /unavailable/i],
      ["ERROR: unable to download video data: <urlopen error timed out>", /timed out/i],
      ["ERROR: Unable to download webpage: getaddrinfo failed", /Network problem/],
      ["OSError: [Errno 28] No space left on device", /disk space/i],
      ["PermissionError: [Errno 13] Permission denied: '/out/v.mp4'", /can't write/i],
      ["ERROR: You have requested merging of multiple formats but ffmpeg is not installed", /FFmpeg/],
      ["ERROR: Unsupported URL: https://example.com/page", /isn't supported/],
      ["ERROR: [youtube] xyz: Requested format is not available", /quality isn't available/],
    ];
    for (const [raw, expected] of cases) {
      expect(friendlyError(raw), raw).toMatch(expected);
    }
  });

  it("falls back rather than leaking unrecognized output", () => {
    expect(friendlyError("ERROR: something nobody has seen before")).toBe("The download failed.");
    expect(friendlyError("", "Custom fallback.")).toBe("Custom fallback.");
    expect(friendlyError(new Error("boom"))).toBe("The download failed.");
  });

  it("prefers the more specific cause when output matches several patterns", () => {
    // Mentions both a network verb and a disk failure — disk is the real cause.
    expect(friendlyError("unable to download: [Errno 28] No space left on device")).toMatch(
      /disk space/i,
    );
  });
});

describe("errorDetails", () => {
  it("keeps raw engine output", () => {
    expect(errorDetails("  ERROR: boom  ")).toBe("ERROR: boom");
  });

  it("hides internal sentinels and empty output", () => {
    expect(errorDetails(NO_OUTPUT_DIR)).toBeUndefined();
    expect(errorDetails(NO_WRITE_PERMISSION)).toBeUndefined();
    expect(errorDetails("   ")).toBeUndefined();
  });
});

describe("analysis timeout (PLAN §27)", () => {
  it("reads as a stall we stopped, not a bad link or a dead connection", () => {
    const message = friendlyError(TIMED_OUT, ANALYZE_FALLBACK);
    expect(message).toMatch(/too long/i);
    // Must not be claimed by the generic /timeout/ rule, which blames the
    // user's internet for what was actually a stalled engine.
    expect(message).not.toMatch(/check your internet/i);
  });

  it("keeps the sentinel out of View details", () => {
    expect(errorDetails(TIMED_OUT)).toBeUndefined();
  });
});
