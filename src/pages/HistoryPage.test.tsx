import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: {
    getHistory: vi.fn(() => Promise.resolve([])),
    saveHistory: vi.fn(() => Promise.resolve()),
    saveQueue: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    revealInFolder: vi.fn(() => Promise.resolve()),
    startDownload: vi.fn(() => new Promise(() => {})),
    notifyDesktop: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import { useHistoryStore } from "@/stores/historyStore";
import { HistoryPage } from "./HistoryPage";
import type { DownloadHistoryItem } from "@/types/download";

const ITEM: DownloadHistoryItem = {
  id: "h1",
  title: "A Video",
  url: "https://site/watch?v=abc",
  filePath: "/out/A Video.mp4",
  format: "mp4",
  quality: "1080p",
  outputDirectory: "/out",
  status: "completed",
  createdAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-01T00:05:00.000Z",
};

const getHistory = vi.mocked(api.getHistory);

beforeEach(() => {
  vi.clearAllMocks();
  useHistoryStore.setState({ history: [] });
});

describe("HistoryPage — loading (PLAN §55)", () => {
  it("shows skeleton rows until the file has been read", async () => {
    getHistory.mockReturnValue(new Promise(() => {})); // never settles
    render(<HistoryPage />);
    expect(screen.getByLabelText("Loading history")).toBeDefined();
    // The empty state must not flash before we know the list is empty.
    expect(screen.queryByText("No history yet")).toBeNull();
  });

  it("falls through to the empty state when there is nothing stored", async () => {
    getHistory.mockResolvedValue([]);
    render(<HistoryPage />);
    expect(await screen.findByText("No history yet")).toBeDefined();
    expect(screen.queryByLabelText("Loading history")).toBeNull();
  });
});

describe("HistoryPage — entries (PLAN §31)", () => {
  async function renderWith(item: DownloadHistoryItem) {
    getHistory.mockResolvedValue([item]);
    render(<HistoryPage />);
    await screen.findByText(item.title);
  }

  it("lists a completed download with its file actions", async () => {
    await renderWith(ITEM);
    fireEvent.click(screen.getByRole("button", { name: "Open file" }));
    expect(api.openFile).toHaveBeenCalledWith("/out/A Video.mp4");
    fireEvent.click(screen.getByRole("button", { name: "Show in folder" }));
    expect(api.revealInFolder).toHaveBeenCalledWith("/out/A Video.mp4");
  });

  it("offers no file actions for a failed entry", async () => {
    await renderWith({ ...ITEM, status: "failed", filePath: undefined });
    expect(screen.queryByRole("button", { name: "Open file" })).toBeNull();
    expect(screen.getByRole("button", { name: "Download again" })).toBeDefined();
  });

  it("removes an entry without deleting the file", async () => {
    await renderWith(ITEM);
    fireEvent.click(screen.getByRole("button", { name: "Remove from history" }));
    expect(useHistoryStore.getState().history).toHaveLength(0);
    expect(api.saveHistory).toHaveBeenCalledWith([]);
    // Nothing in the API can delete a file — removal is metadata only (PLAN §31).
    expect(Object.keys(api)).not.toContain("deleteFile");
  });

  it("re-queues the same source and folder on Download again", async () => {
    await renderWith(ITEM);
    fireEvent.click(screen.getByRole("button", { name: "Download again" }));
    expect(api.startDownload).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        url: ITEM.url,
        outputDirectory: "/out",
        format: "mp4",
        quality: "1080p",
      }),
    );
  });
});
