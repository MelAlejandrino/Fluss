import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// The api module reaches for Tauri at import time, so it's replaced wholesale.
vi.mock("@/lib/api", () => ({
  api: {
    analyzeUrl: vi.fn(),
    pickDirectory: vi.fn(),
    startDownload: vi.fn(),
    saveHistory: vi.fn(),
    notifyDesktop: vi.fn(),
  },
}));

import { api } from "@/lib/api";
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
  fireEvent.change(screen.getByPlaceholderText("Paste a video URL…"), { target: { value: url } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomePage — empty state (PLAN §11)", () => {
  it("shows only the prompt and the URL field", () => {
    render(<HomePage />);
    expect(screen.getByText("Download in flow.")).toBeDefined();
    expect(screen.getByPlaceholderText("Paste a video URL…")).toBeDefined();
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
    fireEvent.submit(screen.getByPlaceholderText("Paste a video URL…").closest("form")!);
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
    const form = screen.getByPlaceholderText("Paste a video URL…").closest("form")!;
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
