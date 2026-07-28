import { useRef, useState } from "react";
import type { VideoMetadata } from "@/types/media";
import { api } from "@/lib/api";
import { friendlyError, errorDetails } from "@/lib/errors";

const ANALYZE_FALLBACK =
  "Unable to analyze this URL. It may be private, unavailable, or unsupported.";

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

  async function analyze(url: string) {
    if (inFlight.current) return;
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL to analyze.");
      setDetails(undefined);
      return;
    }
    inFlight.current = true;
    setLastUrl(trimmed);
    setError(null);
    setDetails(undefined);
    setIsAnalyzing(true);
    setMetadata(null);
    try {
      setMetadata(await api.analyzeUrl(trimmed));
    } catch (err) {
      // Friendly message for the user; raw engine output tucked into details.
      setError(friendlyError(err, ANALYZE_FALLBACK));
      setDetails(errorDetails(err));
    } finally {
      inFlight.current = false;
      setIsAnalyzing(false);
    }
  }

  function reset() {
    setMetadata(null);
    setError(null);
    setDetails(undefined);
    setIsAnalyzing(false);
  }

  const retry = lastUrl ? () => analyze(lastUrl) : undefined;

  return { metadata, isAnalyzing, error, details, analyze, retry, reset } as const;
}
