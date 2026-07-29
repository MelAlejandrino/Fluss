import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAnalyzeUrl } from "./useAnalyzeUrl";
import { useUiStore } from "@/stores/uiStore";
import { api } from "@/lib/api";
import type { VideoMetadata } from "@/types/media";

vi.mock("@/lib/api", () => ({ api: { analyzeUrl: vi.fn() } }));

const META: VideoMetadata = {
  id: "abc",
  title: "An Old Video",
  webpageUrl: "https://site/watch?v=abc",
  availableQualities: [1080],
};

describe("useAnalyzeUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ newDownloadTick: 0, page: "home" });
  });

  it("shows the preview for a completed analysis", async () => {
    vi.mocked(api.analyzeUrl).mockResolvedValue(META);
    const { result } = renderHook(() => useAnalyzeUrl());

    await act(async () => {
      await result.current.analyze("https://site/watch?v=abc");
    });
    expect(result.current.metadata?.title).toBe("An Old Video");
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("drops an in-flight analysis when New Download supersedes it", async () => {
    // Ctrl+N mid-analysis clears the URL field. Without this guard the pending
    // request still resolves and the old video's preview — with a working
    // Download button — appears underneath an empty input.
    let resolveIt!: (m: VideoMetadata) => void;
    vi.mocked(api.analyzeUrl).mockReturnValue(
      new Promise<VideoMetadata>((r) => (resolveIt = r)),
    );

    const { result } = renderHook(() => useAnalyzeUrl());
    act(() => {
      void result.current.analyze("https://site/watch?v=abc");
    });
    expect(result.current.isAnalyzing).toBe(true);

    act(() => {
      useUiStore.getState().newDownload();
    });
    // The spinner must stop too, not run forever over a cleared field.
    expect(result.current.isAnalyzing).toBe(false);

    await act(async () => {
      resolveIt(META);
      await Promise.resolve();
    });
    expect(result.current.metadata).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("stays usable after a superseded analysis", async () => {
    // The `inFlight` guard must be released, or Analyze is dead until restart.
    let resolveFirst!: (m: VideoMetadata) => void;
    vi.mocked(api.analyzeUrl).mockReturnValueOnce(
      new Promise<VideoMetadata>((r) => (resolveFirst = r)),
    );

    const { result } = renderHook(() => useAnalyzeUrl());
    act(() => void result.current.analyze("https://site/watch?v=old"));
    act(() => useUiStore.getState().newDownload());
    await act(async () => {
      resolveFirst(META);
      await Promise.resolve();
    });

    const fresh = { ...META, id: "new", title: "A New Video" };
    vi.mocked(api.analyzeUrl).mockResolvedValue(fresh);
    await act(async () => {
      await result.current.analyze("https://site/watch?v=new");
    });
    await waitFor(() => expect(result.current.metadata?.title).toBe("A New Video"));
  });
});
