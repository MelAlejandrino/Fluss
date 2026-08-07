import type { DownloadItem } from "@/types/download";
import { formatBytes, formatSpeed, formatEta } from "@/lib/formatters";
import { Progress } from "@/components/ui/Progress";

/**
 * Live download telemetry.
 *
 * Hierarchy is deliberate: the percentage is the one number anyone actually
 * reads, so it's the largest thing on the card after the title, and the time
 * remaining sits opposite it. Sizes and speed are supporting detail underneath.
 *
 * Everything numeric is mono and tabular — these values change every second,
 * and proportional digits make the whole row twitch on each update.
 */
export function DownloadProgress({ item }: { item: DownloadItem }) {
  // "processing" = the merge/audio phase after the video stream; totals are
  // unknown early in a stream too → both fall back to an indeterminate bar.
  const indeterminate = item.status === "processing" || item.totalBytes === undefined;

  if (indeterminate) {
    const label = item.status === "processing" ? "Finalizing…" : "Working…";
    return (
      <div className="flex flex-col gap-2">
        <Progress indeterminate label={label} />
        <span className="font-mono text-xs text-ink-3">{label}</span>
      </div>
    );
  }

  const pct = Math.round(item.progress * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-lg font-medium tabular-nums leading-none text-ink">
          {pct}%
        </span>
        <span className="font-mono text-xs tabular-nums text-ink-3">{formatEta(item.eta)}</span>
      </div>
      <Progress value={item.progress} label={`${pct}% downloaded`} />
      <div className="flex items-center justify-between gap-4 font-mono text-xs tabular-nums text-ink-3">
        <span>
          {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
        </span>
        <span>{formatSpeed(item.speed)}</span>
      </div>
    </div>
  );
}
