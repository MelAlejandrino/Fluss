import { describe, it, expect } from "vitest";
import { groupHistory } from "./historyGroups";
import type { DownloadHistoryItem, PlaylistRef } from "@/types/download";

const LIST: PlaylistRef = { id: "pl-1", title: "Road Trip", total: 3 };

function entry(
  id: string,
  status: DownloadHistoryItem["status"],
  at: string,
  playlist?: PlaylistRef,
): DownloadHistoryItem {
  return {
    id,
    title: `Video ${id}`,
    url: `https://site/watch?v=${id}`,
    format: "mp4",
    outputDirectory: "/downloads",
    playlist,
    status,
    createdAt: at,
    completedAt: at,
  };
}

describe("groupHistory", () => {
  it("leaves single downloads as their own rows", () => {
    const groups = groupHistory([
      entry("a", "completed", "2026-08-24T10:00:00.000Z"),
      entry("b", "completed", "2026-08-24T09:00:00.000Z"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["a", "b"]);
    expect(groups.every((g) => g.playlist === undefined)).toBe(true);
  });

  it("folds a playlist into one row and counts its outcomes", () => {
    const groups = groupHistory([
      entry("a", "completed", "2026-08-24T10:02:00.000Z", LIST),
      entry("b", "failed", "2026-08-24T10:01:00.000Z", LIST),
      entry("c", "completed", "2026-08-24T10:00:00.000Z", LIST),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].playlist).toEqual(LIST);
    expect(groups[0].items).toHaveLength(3);
    expect(groups[0].completed).toBe(2);
    expect(groups[0].unfinished).toBe(1);
    // Dated by its newest member, not its oldest.
    expect(groups[0].at).toBe("2026-08-24T10:02:00.000Z");
  });

  it("keeps the playlist where its newest video sits in the list", () => {
    // A playlist finished between two single downloads stays between them,
    // rather than jumping to the top or collecting at the bottom.
    const groups = groupHistory([
      entry("newer", "completed", "2026-08-24T12:00:00.000Z"),
      entry("a", "completed", "2026-08-24T11:00:00.000Z", LIST),
      entry("older", "completed", "2026-08-24T10:30:00.000Z"),
      entry("b", "completed", "2026-08-24T10:00:00.000Z", LIST),
    ]);

    expect(groups.map((g) => g.key)).toEqual(["newer", "pl-1", "older"]);
    // Both of the playlist's videos are in that one row, wherever they were —
    // and listed in the playlist's own order, not the order they were recorded.
    expect(groups[1].items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("shows one row per video after a resume, with the latest outcome", () => {
    // The same video, failed on Monday and fetched on Tuesday. One video, one
    // row, and a count of 1 — not 2 of 2.
    const groups = groupHistory([
      { ...entry("tue", "completed", "2026-08-25T10:00:00.000Z", LIST), url: "https://site/v/a" },
      { ...entry("mon", "failed", "2026-08-24T10:00:00.000Z", LIST), url: "https://site/v/a" },
    ]);

    expect(groups[0].items.map((i) => i.id)).toEqual(["tue"]);
    expect(groups[0].completed).toBe(1);
    expect(groups[0].unfinished).toBe(0);
  });

  it("tells two runs of the same playlist apart", () => {
    // The id is minted per enqueue, so re-downloading a playlist is a second
    // row — the same distinction the queue makes.
    const second: PlaylistRef = { id: "pl-2", title: "Road Trip", total: 1 };
    const groups = groupHistory([
      entry("a", "completed", "2026-08-24T12:00:00.000Z", second),
      entry("b", "completed", "2026-08-20T12:00:00.000Z", LIST),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["pl-2", "pl-1"]);
  });
});

describe("groupHistory under a filter", () => {
  it("counts the whole playlist even when the filter hides half of it", () => {
    // "Completed" hides the failures. Counting only visible rows rendered a
    // playlist with failures as fully successful — no Resume, nothing wrong —
    // while the X button still deleted every entry, including the hidden ones.
    const all = [
      entry("ok", "completed", "2026-08-24T10:02:00.000Z", LIST),
      entry("bad", "failed", "2026-08-24T10:01:00.000Z", LIST),
      entry("gone", "cancelled", "2026-08-24T10:00:00.000Z", LIST),
    ];
    const visible = all.filter((h) => h.status === "completed");

    const [group] = groupHistory(visible, all);
    expect(group.items.map((i) => i.id)).toEqual(["ok"]);
    expect(group.total).toBe(3);
    expect(group.completed).toBe(1);
    expect(group.unfinished).toBe(2);
  });

  it("counts one row per video, not one per attempt", () => {
    const all = [
      { ...entry("tue", "completed", "2026-08-25T10:00:00.000Z", LIST), url: "https://site/v/a" },
      { ...entry("mon", "failed", "2026-08-24T10:00:00.000Z", LIST), url: "https://site/v/a" },
    ];
    const [group] = groupHistory(all, all);
    expect(group.total).toBe(1);
    expect(group.completed).toBe(1);
    expect(group.unfinished).toBe(0);
  });
});
