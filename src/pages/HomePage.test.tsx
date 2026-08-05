import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// The api module reaches for Tauri at import time, so it's replaced wholesale.
vi.mock("@/lib/api", () => ({
  api: {
    analyzeUrl: vi.fn(),
    pickDirectory: vi.fn(),
    // Never settles — enqueuing (bulk or single) kicks off the queue
    // automatically, and these tests only care that it started, not finished.
    startDownload: vi.fn(() => new Promise(() => {})),
    saveHistory: vi.fn(() => Promise.resolve()),
    notifyDesktop: vi.fn(() => Promise.resolve()),
  },
}));

import { api } from "@/lib/api";
import { useDownloadStore } from "@/stores/downloadStore";
import { HomePage } from "./HomePage";

const META = {
  id: "abc",
  title: "A Video",
  thumbnailUrl: "https://img/1.jpg",
  duration: 752,
  uploader: "Someone",
  webpageUrl: "https://site/watch?v=abc",
  availableQualities: [1080, 720, 480, 360],
};

const analyzeUrl = vi.mocked(api.analyzeUrl);

function typeUrl(url: string) {
  fireEvent.change(screen.getByPlaceholderText("Paste a video or audio URL…"), {
    target: { value: url },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useDownloadStore.setState({ downloads: [] });
});

describe("HomePage — empty state (PLAN §11)", () => {
  it("shows only the prompt and the URL field", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading")).toBeDefined();
    expect(screen.getByPlaceholderText("Paste a video or audio URL…")).toBeDefined();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeDefined();
    // No advanced options before an analysis (PLAN §11).
    expect(screen.queryByRole("radiogroup", { name: "Format" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Download" })).toBeNull();
  });
});

describe("HomePage — URL input (PLAN §12)", () => {
  it("rejects an empty URL without calling the engine", () => {
    render(<HomePage />);
    submit();
    expect(screen.getByText("Enter a URL to analyze.")).toBeDefined();
    expect(analyzeUrl).not.toHaveBeenCalled();
  });

  it("trims whitespace and submits on Enter", async () => {
    analyzeUrl.mockResolvedValue(META);
    render(<HomePage />);
    typeUrl("  https://site/watch?v=abc  ");
    // Enter inside the field submits the form.
    fireEvent.submit(screen.getByPlaceholderText("Paste a video or audio URL…").closest("form")!);
    await waitFor(() => expect(analyzeUrl).toHaveBeenCalledWith("https://site/watch?v=abc"));
  });

  it("shows a loading state and disables Analyze while running", async () => {
    analyzeUrl.mockReturnValue(new Promise(() => {})); // never settles
    render(<HomePage />);
    typeUrl("https://site/watch?v=abc");
    submit();
    expect(screen.getByText("Analyzing…")).toBeDefined();
    expect(screen.getByRole("button", { name: "Analyze" })).toHaveProperty("disabled", true);
  });

  it("ignores a second submit while one analysis is in flight", () => {
    analyzeUrl.mockReturnValue(new Promise(() => {}));
    render(<HomePage />);
    typeUrl("https://site/watch?v=abc");
    const form = screen.getByPlaceholderText("Paste a video or audio URL…").closest("form")!;
    // Enter key-repeat: the button is disabled, the form still submits.
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(analyzeUrl).toHaveBeenCalledTimes(1);
  });
});

describe("HomePage — after analysis (PLAN §14–§17)", () => {
  async function analyzeSuccessfully() {
    analyzeUrl.mockResolvedValue(META);
    render(<HomePage />);
    typeUrl("https://site/watch?v=abc");
    submit();
    await screen.findByText("A Video");
  }

  it("previews title, uploader and duration", async () => {
    await analyzeSuccessfully();
    expect(screen.getByText("Someone")).toBeDefined();
    expect(screen.getByText("12:32")).toBeDefined();
  });

  it("offers MP4/MP3 and defaults to MP4", async () => {
    await analyzeSuccessfully();
    expect(screen.getByRole("radio", { name: "MP4 · Video" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("radio", { name: "MP3 · Audio" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("limits quality to what the media actually has", async () => {
    await analyzeSuccessfully();
    const quality = screen.getByRole("radiogroup", { name: "Quality" });
    expect(quality.textContent).toContain("1080p");
    // The media maxes out at 1080p — nothing above it is offered.
    expect(quality.textContent).not.toContain("1440p");
    expect(quality.textContent).not.toContain("2160p");
    // Raw yt-dlp format IDs never surface (PLAN §15).
    expect(quality.textContent).not.toContain("+");
  });

  it("disables quality for audio-only downloads", async () => {
    await analyzeSuccessfully();
    fireEvent.click(screen.getByRole("radio", { name: "MP3 · Audio" }));
    expect(screen.getByRole("radio", { name: "Best" })).toHaveProperty("disabled", true);
  });

  it("warns when no folder is chosen yet", async () => {
    await analyzeSuccessfully();
    expect(screen.getByText("No folder selected")).toBeDefined();
  });
});

describe("HomePage — error state (PLAN §26)", () => {
  it("leads with a friendly reason and hides raw output behind details", async () => {
    const raw = "ERROR: [youtube] abc: Private video. Sign in to confirm your age";
    analyzeUrl.mockRejectedValue(raw);
    render(<HomePage />);
    typeUrl("https://site/watch?v=abc");
    submit();

    await screen.findByText(
      "This media is unavailable — it may be private, removed, or restricted.",
    );
    // The raw text exists, but only inside a collapsed disclosure — never as
    // the message the user reads first.
    const details = screen.getByText(raw).closest("details")!;
    expect(details).toBeDefined();
    expect(details.hasAttribute("open")).toBe(false);
    expect(screen.getByText("View details")).toBeDefined();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("retries the last URL", async () => {
    analyzeUrl.mockRejectedValue("boom");
    render(<HomePage />);
    typeUrl("https://site/watch?v=abc");
    submit();
    const retry = await screen.findByRole("button", { name: "Retry" });

    analyzeUrl.mockResolvedValue(META);
    fireEvent.click(retry);
    await screen.findByText("A Video");
    expect(analyzeUrl).toHaveBeenCalledTimes(2);
    expect(analyzeUrl).toHaveBeenLastCalledWith("https://site/watch?v=abc");
  });
});

describe("HomePage — bulk mode", () => {
  function switchToBulk() {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("tab", { name: "Bulk" }));
  }

  function urlInputs() {
    return screen.getAllByPlaceholderText(/Video URL \d+…/) as HTMLInputElement[];
  }

  it("starts with two empty links and no analyze step", () => {
    switchToBulk();
    expect(urlInputs()).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Analyze" })).toBeNull();
    expect(analyzeUrl).not.toHaveBeenCalled();
  });

  it("adds more link fields on demand", () => {
    switchToBulk();
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(urlInputs()).toHaveLength(3);
  });

  it("blocks the download without a folder, without touching the backend", () => {
    switchToBulk();
    const [first, second] = urlInputs();
    fireEvent.change(first, { target: { value: "https://site/watch?v=a" } });
    fireEvent.change(second, { target: { value: "https://site/watch?v=b" } });
    fireEvent.click(screen.getByRole("button", { name: /Download 2 links/ }));
    expect(api.startDownload).not.toHaveBeenCalled();
    expect(useDownloadStore.getState().downloads).toHaveLength(0);
  });

  it("dedupes blank and repeated links, queues the rest by bare URL", async () => {
    vi.mocked(api.pickDirectory).mockResolvedValue("/downloads");
    switchToBulk();
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    const [first, second, third] = urlInputs();
    fireEvent.change(first, { target: { value: "https://site/watch?v=a" } });
    fireEvent.change(second, { target: { value: "https://site/watch?v=a" } }); // duplicate
    fireEvent.change(third, { target: { value: "  " } }); // blank

    fireEvent.click(screen.getByRole("button", { name: "No folder selected" }));
    await screen.findByText("/downloads");

    fireEvent.click(screen.getByRole("button", { name: /Download 1 link/ }));

    const downloads = useDownloadStore.getState().downloads;
    expect(downloads).toHaveLength(1);
    expect(downloads[0].url).toBe("https://site/watch?v=a");
    // Starts immediately on a bare URL — no analyze round-trip first. Its
    // metadata comes from the download itself.
    expect(downloads[0].title).toBeUndefined();
    expect(analyzeUrl).not.toHaveBeenCalled();
  });

  it("backfills metadata for links still waiting in the queue", async () => {
    vi.mocked(api.pickDirectory).mockResolvedValue("/downloads");
    analyzeUrl.mockResolvedValue(META);
    switchToBulk();
    const [first, second] = urlInputs();
    fireEvent.change(first, { target: { value: "https://site/watch?v=a" } });
    fireEvent.change(second, { target: { value: "https://site/watch?v=b" } });
    fireEvent.click(screen.getByRole("button", { name: "No folder selected" }));
    await screen.findByText("/downloads");
    fireEvent.click(screen.getByRole("button", { name: /Download 2 links/ }));

    await waitFor(() => {
      const queued = useDownloadStore.getState().downloads.find((d) => d.status === "queued");
      expect(queued?.title).toBe("A Video");
      expect(queued?.thumbnailUrl).toBe("https://img/1.jpg");
    });
    // Only the waiting one — the active download reports its own metadata.
    expect(analyzeUrl).toHaveBeenCalledTimes(1);
    expect(analyzeUrl).toHaveBeenCalledWith("https://site/watch?v=b");
  });

  it("fails a bad queued link right away instead of waiting for its turn", async () => {
    vi.mocked(api.pickDirectory).mockResolvedValue("/downloads");
    analyzeUrl.mockRejectedValue("ERROR: [generic] Unsupported URL: nonsense");
    switchToBulk();
    const [first, second] = urlInputs();
    fireEvent.change(first, { target: { value: "https://site/watch?v=a" } });
    fireEvent.change(second, { target: { value: "nonsense" } });
    fireEvent.click(screen.getByRole("button", { name: "No folder selected" }));
    await screen.findByText("/downloads");
    fireEvent.click(screen.getByRole("button", { name: /Download 2 links/ }));

    await waitFor(() => {
      const bad = useDownloadStore.getState().downloads.find((d) => d.url === "nonsense");
      expect(bad?.status).toBe("failed");
      expect(bad?.error).toBe("This link isn't supported. Check the URL, or try a different source.");
      // Raw engine text stays behind "View details" (PLAN §26).
      expect(bad?.errorDetails).toBe("ERROR: [generic] Unsupported URL: nonsense");
    });
    // Never handed to the downloader — rejected before its turn came up. Only
    // the first, valid link was started.
    expect(api.startDownload).toHaveBeenCalledTimes(1);
    // One attempt, not a loop spinning on the same bad URL.
    await new Promise((r) => setTimeout(r, 20));
    expect(analyzeUrl).toHaveBeenCalledTimes(1);
  });

  it("disables the button until at least one link is entered", () => {
    switchToBulk();
    expect(screen.getByRole("button", { name: /Download 0 links/ })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
