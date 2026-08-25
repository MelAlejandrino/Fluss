import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    missingFiles: vi.fn(),
    saveQueue: vi.fn(() => Promise.resolve()),
    saveHistory: vi.fn(() => Promise.resolve()),
  },
}));

import { api } from "@/lib/api";
import { verifyDownloadedFiles } from "./verifyFiles";
import { useDownloadStore } from "@/stores/downloadStore";
import { useHistoryStore } from "@/stores/historyStore";
import type { DownloadHistoryItem, DownloadItem } from "@/types/download";

function download(id: string, filePath?: string, fileMissing?: boolean): DownloadItem {
  return {
    id,
    url: `https://site/watch?v=${id}`,
    title: `Video ${id}`,
    format: "mp4",
    outputDirectory: "/downloads/Road Trip",
    status: "completed",
    progress: 1,
    filePath,
    fileMissing,
    createdAt: "2026-08-24T00:00:00.000Z",
  };
}

function recorded(id: string, filePath?: string, fileMissing?: boolean): DownloadHistoryItem {
  return {
    id,
    title: `Video ${id}`,
    url: `https://site/watch?v=${id}`,
    filePath,
    fileMissing,
    format: "mp4",
    outputDirectory: "/downloads/Road Trip",
    status: "completed",
    createdAt: "2026-08-24T00:00:00.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useDownloadStore.setState({ downloads: [] });
  useHistoryStore.setState({ history: [], loaded: true, unreadable: false });
});

describe("verifyDownloadedFiles", () => {
  it("marks the downloads whose files were deleted", async () => {
    useDownloadStore.setState({
      downloads: [download("a", "/downloads/Road Trip/a.mp4"), download("b", "/downloads/b.mp4")],
    });
    useHistoryStore.setState({
      history: [recorded("a", "/downloads/Road Trip/a.mp4")],
      loaded: true,
      unreadable: false,
    });
    vi.mocked(api.missingFiles).mockResolvedValue(["/downloads/Road Trip/a.mp4"]);

    await verifyDownloadedFiles();

    expect(useDownloadStore.getState().downloads.find((d) => d.id === "a")?.fileMissing).toBe(true);
    // Left untouched rather than written as an explicit false — the flag only
    // ever needs to say "this one is gone".
    expect(
      useDownloadStore.getState().downloads.find((d) => d.id === "b")?.fileMissing,
    ).toBeFalsy();
    expect(useHistoryStore.getState().history[0].fileMissing).toBe(true);
  });

  it("asks about each path once, however many rows point at it", async () => {
    useDownloadStore.setState({ downloads: [download("a", "/downloads/a.mp4")] });
    useHistoryStore.setState({
      history: [recorded("a", "/downloads/a.mp4")],
      loaded: true,
      unreadable: false,
    });
    vi.mocked(api.missingFiles).mockResolvedValue([]);

    await verifyDownloadedFiles();

    expect(api.missingFiles).toHaveBeenCalledWith(["/downloads/a.mp4"]);
  });

  it("clears the flag when the file comes back", async () => {
    // A folder restored from the recycle bin, or a drive plugged back in.
    useHistoryStore.setState({
      history: [recorded("a", "/downloads/a.mp4", true)],
      loaded: true,
      unreadable: false,
    });
    vi.mocked(api.missingFiles).mockResolvedValue([]);

    await verifyDownloadedFiles();

    expect(useHistoryStore.getState().history[0].fileMissing).toBe(false);
  });

  it("changes nothing when the check itself fails", async () => {
    // Saying "your files are gone" on the strength of a failed check is worse
    // than saying nothing at all.
    useHistoryStore.setState({
      history: [recorded("a", "/downloads/a.mp4")],
      loaded: true,
      unreadable: false,
    });
    vi.mocked(api.missingFiles).mockRejectedValue("nope");

    await verifyDownloadedFiles();

    expect(useHistoryStore.getState().history[0].fileMissing).toBeUndefined();
    expect(api.saveHistory).not.toHaveBeenCalled();
  });

  it("doesn't write history when nothing changed", async () => {
    useHistoryStore.setState({
      history: [recorded("a", "/downloads/a.mp4")],
      loaded: true,
      unreadable: false,
    });
    vi.mocked(api.missingFiles).mockResolvedValue([]);

    await verifyDownloadedFiles();

    expect(api.saveHistory).not.toHaveBeenCalled();
  });
});
