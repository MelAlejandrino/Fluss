import { describe, it, expect } from "vitest";
import { nextToStart } from "./downloadManager";
import type { DownloadItem, DownloadStatus } from "@/types/download";

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
