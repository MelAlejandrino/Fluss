import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestInterrupt, performInterrupt } from "./interrupt";
import { useUiStore } from "@/stores/uiStore";
import { useDownloadStore } from "@/stores/downloadStore";
import { api } from "@/lib/api";
import type { DownloadItem } from "@/types/download";

vi.mock("@/lib/api", () => ({
  api: { forceCancelAll: vi.fn(), windowClose: vi.fn() },
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

  it("goes straight through when nothing is downloading", () => {
    requestInterrupt("quit");
    expect(useUiStore.getState().pendingInterrupt).toBeNull(); // no dialog
    expect(api.windowClose).toHaveBeenCalled();

    requestInterrupt("reload");
    expect(reload).toHaveBeenCalled();
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

  it("stops the engines before reloading, not just the UI", () => {
    // A reload wipes the store that tracks downloads while the Rust registry
    // keeps running them — orphaned, uncancellable, unrecorded.
    useDownloadStore.setState({ downloads: [downloading] });
    requestInterrupt("reload");
    performInterrupt("reload");

    expect(api.forceCancelAll).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
    expect(useUiStore.getState().pendingInterrupt).toBeNull();
  });

  it("dismissing leaves the download running", () => {
    useDownloadStore.setState({ downloads: [downloading] });
    requestInterrupt("quit");
    useUiStore.getState().setPendingInterrupt(null);

    expect(api.forceCancelAll).not.toHaveBeenCalled();
    expect(api.windowClose).not.toHaveBeenCalled();
    expect(useDownloadStore.getState().downloads).toHaveLength(1);
  });
});
