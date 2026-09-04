import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestInterrupt, performInterrupt } from "./interrupt";
import { useUiStore } from "@/stores/uiStore";
import { useDownloadStore } from "@/stores/downloadStore";
import { api } from "@/lib/api";
import type { DownloadItem } from "@/types/download";

vi.mock("@/lib/api", () => ({
  api: {
    forceCancelAll: vi.fn(() => Promise.resolve()),
    forceQuit: vi.fn(() => Promise.resolve()),
  },
}));

const reload = vi.fn();
vi.stubGlobal("location", { reload });

const downloading: DownloadItem = {
  id: "d1",
  url: "https://site/v",
  format: "mp4",
  outputDirectory: "/out",
  status: "downloading",
  progress: 0.4,
  createdAt: "2026-07-29T00:00:00.000Z",
};

describe("interrupt (PLAN §45)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ pendingInterrupt: null });
    useDownloadStore.setState({ downloads: [] });
  });

  it("goes straight through when nothing is downloading", async () => {
    await performInterrupt("quit");
    expect(useUiStore.getState().pendingInterrupt).toBeNull(); // no dialog
    expect(api.forceQuit).toHaveBeenCalled();

    await performInterrupt("reload");
    expect(reload).toHaveBeenCalled();
  });

  it("kills the engines before the window closes", async () => {
    // Not just "both were called": the quit closes the window, and a cancel
    // still in flight at that point leaves yt-dlp running with no parent.
    const order: string[] = [];
    vi.mocked(api.forceCancelAll).mockImplementationOnce(async () => {
      order.push("cancel");
    });
    vi.mocked(api.forceQuit).mockImplementationOnce(async () => {
      order.push("quit");
    });

    await performInterrupt("quit");

    expect(order).toEqual(["cancel", "quit"]);
  });

  it("raises the app's own dialog instead of reloading", () => {
    // The whole point: no native beforeunload prompt, and nothing happens
    // until the user confirms.
    useDownloadStore.setState({ downloads: [downloading] });
    requestInterrupt("reload");

    expect(useUiStore.getState().pendingInterrupt).toBe("reload");
    expect(reload).not.toHaveBeenCalled();
    expect(api.forceCancelAll).not.toHaveBeenCalled();
  });

  it("stops the engines before reloading, not just the UI", async () => {
    // A reload wipes the store that tracks downloads while the Rust registry
    // keeps running them — orphaned, uncancellable, unrecorded.
    useDownloadStore.setState({ downloads: [downloading] });
    requestInterrupt("reload");
    await performInterrupt("reload");

    expect(api.forceCancelAll).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
    expect(useUiStore.getState().pendingInterrupt).toBeNull();
  });

  it("dismissing leaves the download running", () => {
    useDownloadStore.setState({ downloads: [downloading] });
    requestInterrupt("quit");
    useUiStore.getState().setPendingInterrupt(null);

    expect(api.forceCancelAll).not.toHaveBeenCalled();
    expect(api.forceQuit).not.toHaveBeenCalled();
    expect(useDownloadStore.getState().downloads).toHaveLength(1);
  });
});
