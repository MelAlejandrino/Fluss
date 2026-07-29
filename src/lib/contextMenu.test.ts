import { describe, it, expect } from "vitest";
import { downloadMenu, historyMenu } from "./contextMenu";
import { clampToViewport, elementUnder, MENU_ROOT_ATTR } from "@/hooks/useContextMenu";
import type { DownloadItem, DownloadHistoryItem, DownloadStatus } from "@/types/download";

const labels = (entries: ReturnType<typeof downloadMenu>) =>
  entries.filter((e) => e !== "separator").map((e) => (e as { label: string }).label);

function item(over: Partial<DownloadItem> = {}): DownloadItem {
  return {
    id: "d1",
    url: "https://example.com/v",
    format: "mp4",
    outputDirectory: "/out",
    status: "queued" as DownloadStatus,
    progress: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("downloadMenu", () => {
  it("offers file actions only once there is a completed file", () => {
    const done = labels(downloadMenu(item({ status: "completed", filePath: "/out/v.mp4" })));
    expect(done).toContain("Open File");
    expect(done).toContain("Show in Folder");
    expect(done).toContain("Copy File Path");

    const queued = labels(downloadMenu(item()));
    expect(queued).not.toContain("Open File");
    expect(queued).not.toContain("Copy File Path");
  });

  it("offers Retry on failed and cancelled, never on active or completed", () => {
    expect(labels(downloadMenu(item({ status: "failed" })))).toContain("Retry");
    expect(labels(downloadMenu(item({ status: "cancelled" })))).toContain("Retry");
    expect(labels(downloadMenu(item({ status: "downloading" })))).not.toContain("Retry");
    expect(labels(downloadMenu(item({ status: "completed" })))).not.toContain("Retry");
  });

  it("offers the error details only when there are some", () => {
    expect(
      labels(downloadMenu(item({ status: "failed", errorDetails: "ERROR: boom" }))),
    ).toContain("Copy Error Details");
    expect(labels(downloadMenu(item({ status: "failed" })))).not.toContain("Copy Error Details");
  });

  it("labels the destructive action for what it actually does", () => {
    expect(labels(downloadMenu(item({ status: "downloading" })))).toContain("Cancel Download");
    expect(labels(downloadMenu(item({ status: "queued" })))).toContain("Remove from Queue");
    // A settled download has nothing left to cancel.
    const done = labels(downloadMenu(item({ status: "completed" })));
    expect(done).not.toContain("Cancel Download");
    expect(done).not.toContain("Remove from Queue");
  });

  it("always offers the source URL", () => {
    for (const status of ["queued", "downloading", "completed", "failed", "cancelled"] as const) {
      expect(labels(downloadMenu(item({ status })))).toContain("Copy Source URL");
    }
  });
});

describe("historyMenu", () => {
  const entry = (over: Partial<DownloadHistoryItem> = {}): DownloadHistoryItem => ({
    id: "h1",
    title: "A Video",
    url: "https://example.com/v",
    format: "mp4",
    outputDirectory: "/out",
    status: "completed",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  });

  it("can always re-download and remove", () => {
    for (const status of ["completed", "failed", "cancelled"] as const) {
      const l = labels(historyMenu(entry({ status })));
      expect(l).toContain("Download Again");
      expect(l).toContain("Remove from History");
    }
  });

  it("hides file actions for entries that never produced a file", () => {
    expect(labels(historyMenu(entry({ status: "failed" })))).not.toContain("Open File");
  });

  it("marks removal as destructive but never deletes the file (PLAN §31)", () => {
    const remove = historyMenu(entry()).find(
      (e) => e !== "separator" && e.label === "Remove from History",
    );
    expect(remove).toMatchObject({ danger: true });
    expect(labels(historyMenu(entry()))).not.toContain("Delete File");
  });
});

describe("clampToViewport", () => {
  const W = 1000;
  const H = 800;

  it("uses the cursor position when the menu fits", () => {
    expect(clampToViewport(100, 100, 200, 300, W, H)).toEqual({ left: 100, top: 100 });
  });

  it("flips instead of overflowing the right or bottom edge", () => {
    expect(clampToViewport(950, 100, 200, 300, W, H).left).toBe(750);
    expect(clampToViewport(100, 700, 200, 300, W, H).top).toBe(400);
  });

  it("stays on screen when the menu is larger than the space either way", () => {
    const { left, top } = clampToViewport(950, 780, 2000, 2000, W, H);
    expect(left).toBe(8);
    expect(top).toBe(8);
  });
});

describe("second right-click on the same card (menu already open)", () => {
  function card() {
    const el = document.createElement("div");
    el.setAttribute("data-menu", "download");
    el.setAttribute("data-menu-id", "d1");
    return el;
  }

  function backdrop() {
    const el = document.createElement("div");
    el.setAttribute(MENU_ROOT_ATTR, "");
    return el;
  }

  it("passes a normal target straight through", () => {
    const el = card();
    expect(elementUnder(el, 10, 10, () => [])).toBe(el);
  });

  it("looks past the open menu's backdrop to the card beneath", () => {
    // Without this the target is the backdrop, `closest('[data-menu]')` misses,
    // and the download's menu is replaced by the generic global one.
    const el = card();
    const over = backdrop();
    expect(elementUnder(over, 10, 10, () => [over, el])).toBe(el);
  });

  it("skips every layer of the menu, not just the first", () => {
    const el = card();
    const over = backdrop();
    const panel = document.createElement("div");
    over.appendChild(panel); // the menu panel itself, inside the backdrop
    expect(elementUnder(panel, 10, 10, () => [panel, over, el])).toBe(el);
  });

  it("yields nothing when only the menu is under the pointer", () => {
    const over = backdrop();
    expect(elementUnder(over, 10, 10, () => [over])).toBeNull();
  });
});
