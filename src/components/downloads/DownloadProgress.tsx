import type { DownloadItem } from "@/types/download";
import { formatBytes, formatSpeed, formatEta } from "@/lib/formatters";

export function DownloadProgress({ item }: { item: DownloadItem }) {
  // "processing" = merging/audio phase after the video stream; totals unknown
  // early in a stream → also indeterminate.
  const indeterminate = item.status === "processing" || item.totalBytes === undefined;

  if (indeterminate) {
    const label = item.status === "processing" ? "Finalizing…" : "Working…";
    return (
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div className="indeterminate-bar h-full w-1/3 rounded-full bg-primary" />
        </div>
        <span className="font-mono text-[11px] text-on-surface-variant">{label}</span>
      </div>
    );
  }

  const pct = Math.round(item.progress * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
        <span>{pct}%</span>
        <span>
          {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
        </span>
        <span>{formatSpeed(item.speed)}</span>
        <span>{formatEta(item.eta)}</span>
      </div>
    </div>
  );
}
