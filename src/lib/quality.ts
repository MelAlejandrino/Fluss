import type { DownloadFormat, VideoQuality } from "@/types/media";

// Standard rungs we offer, highest first. We show the ones at or below the
// video's actual max so the choices reflect what's really available.
const LADDER = [2160, 1440, 1080, 720, 480, 360, 240, 144] as const;

export function qualityOptions(availableHeights: number[]): VideoQuality[] {
  const max = availableHeights.length ? Math.max(...availableHeights) : 0;
  const rungs = max > 0 ? LADDER.filter((h) => h <= max) : [...LADDER];
  return ["best", ...rungs.map((h) => `${h}p` as VideoQuality)];
}

/// Whether a download's quality is worth showing.
///
/// "best" next to an MP3 says nothing — resolution is a video idea, and the
/// audio path ignores the setting entirely. `describe()` already left it out of
/// notifications; the badges were still printing it.
export function showsQuality(format: DownloadFormat): boolean {
  return format !== "mp3";
}
