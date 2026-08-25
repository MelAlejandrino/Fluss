import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: {
    // Never settles — a retry should reach "downloading" and stay there.
    startDownload: vi.fn(() => new Promise(() => {})),
    cancelDownload: vi.fn(() => Promise.resolve()),
    saveHistory: vi.fn(),
    saveQueue: vi.fn(() => Promise.resolve()),
    notifyDesktop: vi.fn(),
    openFile: vi.fn(() => Promise.resolve()),
    revealInFolder: vi.fn(() => Promise.resolve()),
  },
}));

import { api } from "@/lib/api";
import { useDownloadStore } from "@/stores/downloadStore";
import { DownloadsPage } from "./DownloadsPage";
import type { DownloadItem } from "@/types/download";

const MB = 1024 * 1024;

function item(patch: Partial<DownloadItem>): DownloadItem {
  return {
    id: "d1",
    url: "https://site/watch?v=abc",
    title: "A Video",
    format: "mp4",
    quality: "1080p",
    outputDirectory: "/out",
    status: "queued",
    progress: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

function seed(...items: DownloadItem[]) {
  useDownloadStore.setState({ downloads: items });
}

beforeEach(() => {
  vi.clearAllMocks();
  seed();
});

describe("DownloadsPage — empty state", () => {
  it("points the user back to Home", () => {
    render(<DownloadsPage />);
    expect(screen.getByText("No downloads yet")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Start queue" })).toBeNull();
  });
});

describe("DownloadsPage — progress (PLAN §21)", () => {
  it("shows percentage, sizes, speed and ETA", () => {
    seed(
      item({
        status: "downloading",
        progress: 0.45,
        downloadedBytes: 45 * MB,
        totalBytes: 100 * MB,
        speed: 4 * MB,
        eta: 18,
      }),
    );
    render(<DownloadsPage />);
    expect(screen.getByText("45%")).toBeDefined();
    expect(screen.getByText("45.0 MB / 100.0 MB")).toBeDefined();
    expect(screen.getByText("4.0 MB/s")).toBeDefined();
    expect(screen.getByText("~18s remaining")).toBeDefined();
    // Status is text + icon, never colour alone (PLAN §50). Twice: the section
    // heading and the card's own chip.
    expect(screen.getAllByText("Downloading")).toHaveLength(2);
  });

  it("falls back to an indeterminate bar before totals are known", () => {
    seed(item({ status: "downloading", progress: 0 }));
    render(<DownloadsPage />);
    expect(screen.getByText("Working…")).toBeDefined();
  });

  it("reports the merge phase as finalizing", () => {
    seed(item({ status: "processing", progress: 1, totalBytes: 100 * MB }));
    render(<DownloadsPage />);
    expect(screen.getByText("Finalizing…")).toBeDefined();
  });

  it("cancels an active download through the backend", () => {
    seed(item({ status: "downloading", progress: 0.5, totalBytes: 100 * MB }));
    render(<DownloadsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(api.cancelDownload).toHaveBeenCalledWith("d1");
  });
});

describe("DownloadsPage — queue (PLAN §19)", () => {
  it("lists queued items behind the active one and offers a manual Start", () => {
    seed(item({ id: "a", status: "queued", title: "Video A" }), item({ id: "b", status: "queued", title: "Video B" }));
    render(<DownloadsPage />);
    expect(screen.getAllByText("Queued").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2 items")).toBeDefined();
    expect(screen.getByText("Video A")).toBeDefined();
    expect(screen.getByText("Video B")).toBeDefined();
    // Nothing is running, so the queue can be kicked manually.
    expect(screen.getByRole("button", { name: "Start queue" })).toBeDefined();
  });

  it("drops a queued item without touching the backend", () => {
    seed(item({ status: "queued" }));
    render(<DownloadsPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove from queue" })[0]);
    expect(api.cancelDownload).not.toHaveBeenCalled();
    expect(useDownloadStore.getState().downloads).toHaveLength(0);
  });
});

describe("DownloadsPage — finished states (PLAN §25, §26)", () => {
  it("offers Open File and Show in Folder when completed", () => {
    seed(item({ status: "completed", progress: 1, filePath: "/out/A Video.mp4" }));
    render(<DownloadsPage />);
    expect(screen.getByText("Completed")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Open File/ }));
    expect(api.openFile).toHaveBeenCalledWith("/out/A Video.mp4");
    fireEvent.click(screen.getByRole("button", { name: /Show in Folder/ }));
    expect(api.revealInFolder).toHaveBeenCalledWith("/out/A Video.mp4");
  });

  it("shows the friendly failure reason with raw output behind details", () => {
    seed(
      item({
        status: "failed",
        error: "Network problem. Check your internet connection and try again.",
        errorDetails: "ERROR: unable to download webpage",
      }),
    );
    render(<DownloadsPage />);
    expect(
      screen.getByText("Network problem. Check your internet connection and try again."),
    ).toBeDefined();
    expect(screen.getByText("View details")).toBeDefined();
    expect(screen.getByRole("button", { name: /Retry/ })).toBeDefined();
  });

  it("re-queues a failed download on Retry", () => {
    seed(item({ status: "failed", error: "The download failed." }));
    render(<DownloadsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    const downloads = useDownloadStore.getState().downloads;
    expect(downloads).toHaveLength(1);
    expect(downloads[0].status).toBe("downloading"); // auto-start is on by default
    expect(downloads[0].id).not.toBe("d1"); // a fresh item, not the failed one
  });
});
