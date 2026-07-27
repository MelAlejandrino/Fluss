import { useState } from "react";
import type { VideoMetadata } from "@/types/media";
import { api } from "@/lib/api";

export function useAnalyzeUrl() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | undefined>(undefined);

  async function analyze(url: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL to analyze.");
      return;
    }
    setError(null);
    setDetails(undefined);
    setIsAnalyzing(true);
    setMetadata(null);
    try {
      setMetadata(await api.analyzeUrl(trimmed));
    } catch (err) {
      // Friendly message for the user; raw engine output tucked into details.
      setError("Unable to analyze this URL. It may be private, unavailable, or unsupported.");
      setDetails(typeof err === "string" ? err : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function reset() {
    setMetadata(null);
    setError(null);
    setDetails(undefined);
    setIsAnalyzing(false);
  }

  return { metadata, isAnalyzing, error, details, analyze, reset } as const;
}
