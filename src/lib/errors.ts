// Raw yt-dlp/OS output is never the primary error message (PLAN §26). This maps
// the engine's stderr to something a person can act on; the raw text still goes
// into the "View details" section so nothing is hidden.

/** Shown when analysis fails for a reason none of the patterns below recognise. */
export const ANALYZE_FALLBACK =
  "Unable to analyze this URL. It may be private, unavailable, or unsupported.";

/** Distinct signal from Rust for a user cancellation (vs. a real failure). */
export const CANCELLED = "__CANCELLED__";
export const NO_OUTPUT_DIR = "__NODIR__";
export const NO_WRITE_PERMISSION = "__NOWRITE__";

// First match wins, so order matters: specific causes before generic ones.
const PATTERNS: [RegExp, string][] = [
  [/__NODIR__/, "That download folder no longer exists. Pick another one in Settings."],
  [
    /__NOWRITE__|permission denied|access is denied|\[errno 13\]|read-only file system/i,
    "Fluss can't write to that folder. Choose a different one, or check its permissions.",
  ],
  [
    /no space left|not enough space|disk (is )?full|\[errno 28\]/i,
    "Not enough disk space to finish this download. Free up space and try again.",
  ],
  [
    /ffmpeg (is )?not (installed|found)|you have requested merging|ffprobe.*not found/i,
    "The media processor (FFmpeg) is missing, so the video and audio can't be combined.",
  ],
  [
    /private video|sign in to confirm|members[- ]only|login required|this video is unavailable|video unavailable|has been removed|account associated with this video has been terminated/i,
    "This media is unavailable — it may be private, removed, or restricted.",
  ],
  [
    /age[- ]restricted|confirm your age|inappropriate for some users/i,
    "This media is age-restricted and can't be downloaded without signing in.",
  ],
  [
    /unsupported url|is not a valid url|no video formats found|unable to extract/i,
    "This link isn't supported. Check the URL, or try a different source.",
  ],
  [
    /timed? ?out|timeout/i,
    "The connection timed out. Check your internet and try again.",
  ],
  [
    /network|getaddrinfo|name or service not known|temporary failure in name resolution|connection (reset|refused|aborted)|unable to (connect|download webpage)|ssl|certificate/i,
    "Network problem. Check your internet connection and try again.",
  ],
  [
    /requested format (is )?not available|no formats? matching/i,
    "That quality isn't available for this media. Try another quality.",
  ],
  [
    /could not start the downloader engine/i,
    "The downloader engine couldn't start. Try reinstalling Fluss.",
  ],
];

/** A short, human-readable reason for a failure. */
export function friendlyError(raw: unknown, fallback = "The download failed."): string {
  const text = typeof raw === "string" ? raw : String(raw);
  for (const [pattern, message] of PATTERNS) {
    if (pattern.test(text)) return message;
  }
  return fallback;
}

/** The raw engine output to show behind "View details" — omitted when empty. */
export function errorDetails(raw: unknown): string | undefined {
  const text = typeof raw === "string" ? raw : String(raw);
  const trimmed = text.trim();
  // Sentinels are internal signals, not output worth showing.
  if (!trimmed || trimmed === NO_OUTPUT_DIR || trimmed === NO_WRITE_PERMISSION) return undefined;
  return trimmed;
}
