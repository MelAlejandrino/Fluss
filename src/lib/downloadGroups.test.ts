import { describe, it, expect } from "vitest";
import {
  groupByPlaylist,
  isPending,
  isUnfinished,
  hasFile,
  byPlaylistOrder,
} from "./downloadGroups";
import type { DownloadItem, DownloadStatus, PlaylistRef } from "@/types/download";

const LIST: PlaylistRef = { id: "pl-1", title: "Road Trip", total: 4 };

function item(id: string, status: DownloadStatus, playlist?: PlaylistRef): DownloadItem {
  return {
    id,
    url: `https://site/watch?v=${id}`,
    format: "mp4",
    outputDirectory: "/downloads",
    playlist,
    status,
    progress: 0,
    createdAt: "2026-08-24T00:00:00.000Z",
  };
}

/// The page always passes one band plus the whole list; these cases are all
/// about the queued band.
function queuedGroups(all: DownloadItem[]) {
  return groupByPlaylist(
    all.filter((d) => d.status === "queued"),
    all,
  );
}

describe("groupByPlaylist", () => {
  it("keeps loose items in one unlabelled band", () => {
    const groups = queuedGroups([item("a", "queued"), item("b", "queued")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].playlist).toBeUndefined();
    expect(groups[0].items.map((i: DownloadItem) => i.id)).toEqual(["a", "b"]);
  });

  it("bands a playlist separately from loose items", () => {
    const groups = queuedGroups([
      item("loose", "queued"),
      item("a", "queued", LIST),
      item("b", "queued", LIST),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[1].playlist).toEqual(LIST);
    expect(groups[1].items).toHaveLength(2);
  });

  it("counts progress across the whole playlist, not just what's still queued", () => {
    // Half of it has already left the queue — that's exactly when "2 of 4"
    // is worth showing on the rows that remain.
    const groups = queuedGroups([
      item("a", "completed", LIST),
      item("b", "completed", LIST),
      item("c", "downloading", LIST),
      item("d", "queued", LIST),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i: DownloadItem) => i.id)).toEqual(["d"]);
    expect(groups[0].done).toBe(2);
    expect(groups[0].total).toBe(4);
  });

  it("has nothing to show once the queue drains", () => {
    expect(queuedGroups([item("a", "completed", LIST)])).toEqual([]);
  });
});

describe("isUnfinished", () => {
  it("is true only for the ones that stopped without a file", () => {
    expect(isUnfinished(item("a", "failed"))).toBe(true);
    expect(isUnfinished(item("a", "cancelled"))).toBe(true);
    expect(isUnfinished(item("a", "completed"))).toBe(false);
    expect(isUnfinished(item("a", "queued"))).toBe(false);
  });

  it("counts a completed download whose file was deleted", () => {
    // Deleting the playlist folder leaves rows that say "completed" and a
    // folder with nothing in it. To a resume they are the same as never having
    // downloaded — that's the whole point of noticing.
    expect(isUnfinished({ ...item("a", "completed"), fileMissing: true })).toBe(true);
    expect(hasFile({ ...item("a", "completed"), fileMissing: true })).toBe(false);
    expect(hasFile(item("a", "completed"))).toBe(true);
  });
});

describe("groupByPlaylist with deleted files", () => {
  it("stops counting a video whose file is gone as downloaded", () => {
    const three = { ...LIST, total: 3 };
    const all = [
      { ...item("a", "completed", three), fileMissing: true },
      { ...item("b", "completed", three) },
      item("c", "queued", three),
    ];
    const groups = groupByPlaylist(
      all.filter((d) => d.status === "queued"),
      all,
    );
    expect(groups[0].done).toBe(1);
    expect(groups[0].unfinished).toBe(1);
    expect(groups[0].total).toBe(3);
  });
});

describe("isPending", () => {
  it("is true only while something can still happen to it", () => {
    expect(isPending(item("a", "queued"))).toBe(true);
    expect(isPending(item("a", "downloading"))).toBe(true);
    expect(isPending(item("a", "processing"))).toBe(true);
    expect(isPending(item("a", "completed"))).toBe(false);
    expect(isPending(item("a", "cancelled"))).toBe(false);
    expect(isPending(item("a", "failed"))).toBe(false);
  });
});

describe("byPlaylistOrder", () => {
  function at(id: string, createdAt: string, playlistIndex?: number) {
    return { id, createdAt, playlistIndex };
  }

  it("orders by position, not by timestamp", () => {
    // The bug this covers: a playlist enqueues every video inside the same
    // millisecond, so every createdAt is identical. Sorting by it did nothing
    // and left the list in store order — newest first — which made a resume
    // start with the *last* video of the playlist.
    const same = "2026-08-24T10:00:00.000Z";
    const ordered = byPlaylistOrder([at("c", same, 2), at("a", same, 0), at("b", same, 1)]);
    expect(ordered.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back to the timestamp for downloads with no position", () => {
    expect(
      byPlaylistOrder([
        at("later", "2026-08-24T12:00:00.000Z"),
        at("earlier", "2026-08-24T09:00:00.000Z"),
      ]).map((i) => i.id),
    ).toEqual(["earlier", "later"]);
  });

  it("leaves the input alone", () => {
    const input = [at("b", "2026-08-24T10:00:00.000Z", 1), at("a", "2026-08-24T10:00:00.000Z", 0)];
    byPlaylistOrder(input);
    expect(input.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("groupByPlaylist after a restart", () => {
  it("reports the playlist's own size, not what's left in the queue", () => {
    // The queue file only keeps unfinished items, so after a restart the six
    // completed members are gone from the store. Counting rows turned
    // "6 of 12 downloaded" into "0 of 6".
    const twelve = { ...LIST, total: 12 };
    const all = [
      item("g", "queued", twelve),
      item("h", "queued", twelve),
      item("i", "queued", twelve),
      item("j", "queued", twelve),
      item("k", "queued", twelve),
      item("l", "queued", twelve),
    ];

    const [group] = groupByPlaylist(all, all);
    expect(group.total).toBe(12);
    expect(group.done).toBe(6);
  });
});
