import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/window", () => ({
  minimizeWindow: vi.fn(),
  toggleMaximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
}));
vi.mock("@/hooks/useMaximized", () => ({ useMaximized: () => false }));

const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/// The platform is read once at module load, so each case needs a fresh import
/// with the user agent already in place.
async function titleBarFor(userAgent: string) {
  vi.stubGlobal("navigator", { userAgent });
  vi.resetModules();
  const { TitleBar } = await import("./TitleBar");
  return TitleBar;
}

/// Left-to-right order of the caption buttons as rendered.
function captionOrder() {
  return Array.from(document.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"));
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TitleBar", () => {
  it("puts close in the top-left, macOS order, on macOS", async () => {
    // The window is undecorated everywhere, so these are the only buttons there
    // are. In the top-right of a Mac window, the corner someone slams the
    // pointer into to close the app does nothing at all.
    const TitleBar = await titleBarFor(MAC);
    render(<TitleBar />);

    expect(captionOrder()).toEqual(["Close", "Minimize", "Maximize"]);
    // Rendered before the wordmark, which is what puts them on the left.
    const [first] = document.querySelectorAll("button, img");
    expect(first.tagName).toBe("BUTTON");
  });

  it("keeps the Windows cluster on the right, in Windows order", async () => {
    const TitleBar = await titleBarFor(WINDOWS);
    render(<TitleBar />);

    expect(captionOrder()).toEqual(["Minimize", "Maximize", "Close"]);
    const [first] = document.querySelectorAll("button, img");
    expect(first.tagName).toBe("IMG");
  });

  it("offers the same three controls either way", async () => {
    for (const ua of [MAC, WINDOWS]) {
      document.body.innerHTML = "";
      const TitleBar = await titleBarFor(ua);
      render(<TitleBar />);
      expect(screen.getByLabelText("Close")).toBeDefined();
      expect(screen.getByLabelText("Minimize")).toBeDefined();
      expect(screen.getByLabelText("Maximize")).toBeDefined();
    }
  });
});
