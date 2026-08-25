import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api", () => ({ api: { saveQueue: vi.fn(() => Promise.resolve()) } }));

import { restoredQueue } from "./downloadStore";
import type { DownloadItem, DownloadStatus } from "@/types/download";

function item(id: string, status: DownloadStatus, extra: Partial<DownloadItem> = {}): DownloadItem {
  return {
    id,
    url: `https://site/watch?v=${id}`,
    title: `Video ${id}`,
    format: "mp4",
    outputDirectory: "/downloads",
    status,
    progress: 0.42,
    createdAt: "2026-08-24T00:00:00.000Z",
    ...extra,
  };
}

describe("restoredQueue", () => {
  it("puts an interrupted download back in the queue", () => {
    // Its yt-dlp process died with the app; there is no such thing as a
    // running download we aren't attached to.
    const [restored] = restoredQueue([item("a", "downloading", { speed: 1_000, eta: 30 })]);
    expect(restored.status).toBe("queued");
    expect(restored.progress).toBe(0);
    expect(restored.speed).toBeUndefined();
    expect(restored.eta).toBeUndefined();
  });

  it("keeps the id, so the half-downloaded file is found again", () => {
    const [restored] = restoredQueue([item("a", "processing")]);
    expect(restored.id).toBe("a");
  });

  it("carries the title forward for the partial-file match", () => {
    const [restored] = restoredQueue([item("a", "downloading")]);
    expect(restored.previousTitle).toBe("Video a");

    // An earlier attempt's title wins — that's the name the partials carry.
    const [retried] = restoredQueue([
      item("b", "downloading", { title: "Renamed", previousTitle: "Original" }),
    ]);
    expect(retried.previousTitle).toBe("Original");
  });

  it("drops anything already settled — history is the record of those", () => {
    expect(
      restoredQueue([
        item("a", "completed"),
        item("b", "failed"),
        item("c", "cancelled"),
        item("d", "queued"),
      ]).map((i) => i.id),
    ).toEqual(["d"]);
  });

  it("keeps the playlist, so a resumed batch is still one block", () => {
    const playlist = { id: "pl-1", title: "Road Trip", total: 1 };
    const [restored] = restoredQueue([item("a", "queued", { playlist })]);
    expect(restored.playlist).toEqual(playlist);
  });
});
