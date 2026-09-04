import { describe, it, expect, vi, beforeEach } from "vitest";

// Touching the store means touching the module that talks to Tauri.
vi.mock("@/lib/api", () => ({
  api: {
    cancelDownload: vi.fn(() => Promise.resolve()),
    saveQueue: vi.fn(() => Promise.resolve()),
    saveHistory: vi.fn(() => Promise.resolve()),
    // Never settle: these tests care about what lands in the queue, not what
    // happens to it afterwards.
    startDownload: vi.fn(() => new Promise(() => {})),
    analyzeUrl: vi.fn(() => new Promise(() => {})),
  },
}));

import { api } from "@/lib/api";
import { nextToStart, cancelGroup, retryGroup, enqueue } from "./downloadManager";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDownloadStore } from "@/stores/downloadStore";
import { useHistoryStore } from "@/stores/historyStore";
import { byPlaylistOrder } from "@/lib/downloadGroups";
import type { DownloadItem, DownloadStatus, PlaylistRef } from "@/types/download";

// Store prepends, so newest is first / oldest is last.
function items(...statuses: DownloadStatus[]): DownloadItem[] {
  return statuses.map((status, i) => ({
    id: `d${i}`,
    url: "u",
    format: "mp4",
    outputDirectory: "/out",
    status,
    progress: 0,
    createdAt: `${i}`,
  }));
}

describe("nextToStart", () => {
  it("returns nothing while a download is active", () => {
    expect(nextToStart(items("downloading", "queued"))).toBeNull();
    expect(nextToStart(items("processing", "queued"))).toBeNull();
  });

  it("picks the oldest queued when idle", () => {
    // newest-first: [queued d0, queued d1] → oldest is d1
    expect(nextToStart(items("queued", "queued"))?.id).toBe("d1");
  });

  it("returns null when nothing is queued", () => {
    expect(nextToStart(items("completed", "failed"))).toBeNull();
    expect(nextToStart([])).toBeNull();
  });
});

describe("cancelGroup", () => {
  const LIST: PlaylistRef = { id: "pl-1", title: "Road Trip", total: 3 };
  const OTHER: PlaylistRef = { id: "pl-2", title: "Cooking", total: 1 };

  function seed(...seeds: Array<[string, DownloadStatus, PlaylistRef?]>) {
    useDownloadStore.setState({
      downloads: seeds.map(([id, status, playlist]) => ({
        id,
        url: `https://site/watch?v=${id}`,
        format: "mp4",
        outputDirectory: "/out",
        playlist,
        status,
        progress: 0,
        createdAt: id,
      })),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    useHistoryStore.setState({ history: [], loaded: true, unreadable: false });
  });

  it("keeps the waiting items as cancelled, and kills the running one", () => {
    seed(["running", "downloading", LIST], ["waiting", "queued", LIST]);
    cancelGroup(LIST.id);

    // The running one can only be stopped by the process being killed; it
    // settles when that rejection comes back, not here.
    expect(api.cancelDownload).toHaveBeenCalledWith("running");
    // The waiting one stays, marked — deleting it is what left a resume with
    // nothing to bring back.
    const { downloads } = useDownloadStore.getState();
    expect(downloads.map((d) => d.id)).toEqual(["running", "waiting"]);
    expect(downloads.find((d) => d.id === "waiting")?.status).toBe("cancelled");
  });

  it("records the videos it never got to, so they can be resumed later", () => {
    seed(["a", "queued", LIST], ["b", "queued", LIST]);
    cancelGroup(LIST.id);

    const history = useHistoryStore.getState().history;
    expect(history.map((h) => h.id).sort()).toEqual(["a", "b"]);
    expect(history.every((h) => h.status === "cancelled")).toBe(true);
    // Recorded as part of the playlist, or history couldn't offer to resume it.
    expect(history.every((h) => h.playlist?.id === LIST.id)).toBe(true);
  });

  it("leaves other playlists and loose downloads alone", () => {
    seed(["mine", "queued", LIST], ["theirs", "queued", OTHER], ["loose", "queued"]);
    cancelGroup(LIST.id);

    const { downloads } = useDownloadStore.getState();
    expect(downloads.find((d) => d.id === "mine")?.status).toBe("cancelled");
    expect(downloads.find((d) => d.id === "theirs")?.status).toBe("queued");
    expect(downloads.find((d) => d.id === "loose")?.status).toBe("queued");
    expect(api.cancelDownload).not.toHaveBeenCalled();
  });

  it("does nothing to items that have already finished", () => {
    seed(["done", "completed", LIST], ["gone", "cancelled", LIST]);
    cancelGroup(LIST.id);

    expect(useDownloadStore.getState().downloads).toHaveLength(2);
    expect(api.cancelDownload).not.toHaveBeenCalled();
  });
});

describe("retryGroup", () => {
  const LIST: PlaylistRef = { id: "pl-1", title: "Road Trip", total: 3 };
  const OTHER: PlaylistRef = { id: "pl-2", title: "Cooking", total: 1 };

  function one(id: string, status: DownloadStatus, playlist?: PlaylistRef): DownloadItem {
    return {
      id,
      url: `https://site/watch?v=${id}`,
      title: `Video ${id}`,
      format: "mp4",
      outputDirectory: "/downloads/Road Trip",
      playlist,
      status,
      progress: 0,
      createdAt: id,
    };
  }

  // Newest-first, the way the store holds them.
  function seed(...seeds: Array<[string, DownloadStatus, PlaylistRef?]>) {
    useDownloadStore.setState({
      downloads: seeds.map(([id, status, playlist]) => one(id, status, playlist)),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Keep the queue still, so what's asserted is what was enqueued.
    useSettingsStore.setState((s) => ({
      settings: { ...s.settings, autoStartDownloads: false },
    }));
  });

  it("puts every unfinished video of the playlist back, and nothing else", () => {
    seed(
      ["c", "cancelled", LIST],
      ["b", "failed", LIST],
      ["a", "completed", LIST],
      ["other", "cancelled", OTHER],
      ["loose", "cancelled"],
    );
    retryGroup(LIST.id);

    const { downloads } = useDownloadStore.getState();
    const requeued = downloads.filter((d) => d.status === "queued");
    expect(requeued).toHaveLength(2);
    expect(requeued.map((d) => d.url).sort()).toEqual([
      "https://site/watch?v=b",
      "https://site/watch?v=c",
    ]);
    // The completed one is left alone, and so is every other download.
    expect(downloads.find((d) => d.id === "a")?.status).toBe("completed");
    expect(downloads.find((d) => d.id === "other")?.status).toBe("cancelled");
    expect(downloads.find((d) => d.id === "loose")?.status).toBe("cancelled");
  });

  it("resumes in playlist order, whatever order the store holds", () => {
    // The interrupted video is recorded after the ones that never started, so
    // it sits at the *front* of the store — the position that used to make it
    // resume last, behind everything else, with its half-downloaded file idle.
    useDownloadStore.setState({
      downloads: [
        { ...one("interrupted", "cancelled", LIST), createdAt: "2026-08-24T10:00:01.000Z" },
        { ...one("later", "cancelled", LIST), createdAt: "2026-08-24T10:00:09.000Z" },
        { ...one("middle", "cancelled", LIST), createdAt: "2026-08-24T10:00:05.000Z" },
      ],
    });
    retryGroup(LIST.id);

    const queue = useDownloadStore.getState().downloads.filter((d) => d.status === "queued");
    expect(nextToStart(queue)?.url).toBe("https://site/watch?v=interrupted");
    // And the rest keep the playlist's order behind it.
    expect(byPlaylistOrder(queue).map((d) => d.url)).toEqual([
      "https://site/watch?v=interrupted",
      "https://site/watch?v=middle",
      "https://site/watch?v=later",
    ]);
  });

  it("keeps them in the playlist, and asks the engine to resume them", () => {
    seed(["b", "cancelled", LIST]);
    retryGroup(LIST.id);

    const requeued = useDownloadStore.getState().downloads.find((d) => d.status === "queued");
    expect(requeued?.playlist).toEqual(LIST);
    // The title from the failed attempt is what the kept `.part` file is named
    // after — without it "Keep partial files" can't resume anything.
    expect(requeued?.previousTitle).toBe("Video b");
    expect(requeued?.outputDirectory).toBe("/downloads/Road Trip");
  });
});

describe("duplicate guard", () => {
  beforeEach(() => {
    useDownloadStore.setState({ downloads: [] });
    useHistoryStore.setState({ history: [], loaded: true, unreadable: false });
  });

  it("won't queue the same download twice while one is still pending", () => {
    const input = {
      url: "https://site/v1",
      format: "mp4" as const,
      quality: "best" as const,
      outputDirectory: "/out",
    };
    enqueue(input);
    enqueue(input);

    expect(useDownloadStore.getState().downloads).toHaveLength(1);
  });

  it("still allows a different quality, folder, or a finished one again", () => {
    const base = {
      url: "https://site/v1",
      format: "mp4" as const,
      quality: "best" as const,
      outputDirectory: "/out",
    };
    enqueue(base);
    enqueue({ ...base, quality: "720p" });
    enqueue({ ...base, outputDirectory: "/elsewhere" });
    expect(useDownloadStore.getState().downloads).toHaveLength(3);

    // Once it's no longer pending, asking for it again is a real request.
    const done = useDownloadStore.getState().downloads;
    done.forEach((d) => useDownloadStore.getState().update(d.id, { status: "completed" }));
    enqueue(base);
    expect(useDownloadStore.getState().downloads).toHaveLength(4);
  });
});
