import type { VideoQuality } from "@/types/media";

// Standard rungs we offer, highest first. We show the ones at or below the
// video's actual max so the choices reflect what's really available.
const LADDER = [2160, 1440, 1080, 720, 480, 360, 240, 144] as const;

export function qualityOptions(availableHeights: number[]): VideoQuality[] {
  const max = availableHeights.length ? Math.max(...availableHeights) : 0;
  const rungs = max > 0 ? LADDER.filter((h) => h <= max) : [...LADDER];
  return ["best", ...rungs.map((h) => `${h}p` as VideoQuality)];
}
