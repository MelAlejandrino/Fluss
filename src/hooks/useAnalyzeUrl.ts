import { useEffect, useRef, useState } from "react";
import type { VideoMetadata } from "@/types/media";
import { api } from "@/lib/api";
import { useUiStore } from "@/stores/uiStore";
import { friendlyError, errorDetails, ANALYZE_FALLBACK } from "@/lib/errors";

export function useAnalyzeUrl() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | undefined>(undefined);
  // Kept so the Retry action can re-run the last attempt.
  const [lastUrl, setLastUrl] = useState("");
  // A ref, not `isAnalyzing` — Enter key-repeat can fire twice before React
  // re-renders, and each spawns its own yt-dlp process (PLAN §12).
  const inFlight = useRef(false);
  // Bumped whenever the current attempt stops being the one we care about. An
  // analysis takes seconds, and "New Download" can land in the middle of one.
  const generation = useRef(0);

  async function analyze(url: string) {
    if (inFlight.current) return;
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL to analyze.");
      setDetails(undefined);
      return;
    }
    const attempt = ++generation.current;
    const isCurrent = () => attempt === generation.current;
    inFlight.current = true;
    setLastUrl(trimmed);
    setError(null);
    setDetails(undefined);
    setIsAnalyzing(true);
    setMetadata(null);
    try {
      const meta = await api.analyzeUrl(trimmed);
      if (!isCurrent()) return; // superseded — don't resurrect the old preview
      setMetadata(meta);
    } catch (err) {
      if (!isCurrent()) return;
      // Friendly message for the user; raw engine output tucked into details.
      setError(friendlyError(err, ANALYZE_FALLBACK));
      setDetails(errorDetails(err));
    } finally {
      // Guarded: a superseded attempt must not clear the spinner belonging to
      // whatever replaced it.
      if (isCurrent()) {
        inFlight.current = false;
        setIsAnalyzing(false);
      }
    }
  }

  function reset() {
    setMetadata(null);
    setError(null);
    setDetails(undefined);
    setIsAnalyzing(false);
  }

  // "New Download" clears the field, so the preview under it has to go too —
  // otherwise you're looking at the last video's thumbnail and Download button
  // above an empty input.
  const newDownloadTick = useUiStore((s) => s.newDownloadTick);
  useEffect(() => {
    if (newDownloadTick === 0) return; // initial mount, nothing to clear
    // Retire any attempt still running: it would otherwise resolve into a
    // preview for the URL that was just dismissed, and its `finally` would
    // fight whatever the user analyzes next.
    generation.current++;
    inFlight.current = false;
    setIsAnalyzing(false);
    setMetadata(null);
    setError(null);
    setDetails(undefined);
  }, [newDownloadTick]);

  const retry = lastUrl ? () => analyze(lastUrl) : undefined;

  return { metadata, isAnalyzing, error, details, analyze, retry, reset } as const;
}
