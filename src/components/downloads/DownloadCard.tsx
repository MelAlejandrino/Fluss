import { X, FolderOpen, Play, RotateCcw, TriangleAlert } from "lucide-react";
import type { DownloadCardProps } from "@/types/download";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { showsQuality } from "@/lib/quality";
import { DownloadStatus } from "./DownloadStatus";
import { DownloadProgress } from "./DownloadProgress";
import { Thumbnail } from "./Thumbnail";

/**
 * A download, at full detail. One card holds everything about a single item:
 * what it is, where it got to, what went wrong, and what you can do next —
 * so nothing about it is ever a click away.
 *
 * Actions only appear once they're possible, which keeps a queue of waiting
 * items visually quiet and makes the finished ones obviously actionable.
 */
export function DownloadCard({ item, onOpen, onReveal, onCancel, onRetry }: DownloadCardProps) {
  const showProgress = item.status === "downloading" || item.status === "processing";
  const isDone = item.status === "completed";
  const canRetry = item.status === "failed" || item.status === "cancelled";
  const hasActions = showProgress || isDone || canRetry;

  return (
    // `items-start` matters: a stretched flex child overrides aspect-ratio, and
    // the card is always taller than a 16:9 thumbnail once progress and actions
    // are in it — without this the artwork silently turns portrait.
    <Card data-menu="download" data-menu-id={item.id} className="flex items-start gap-5">
      <Thumbnail src={item.thumbnailUrl} className="w-40 max-sm:w-28" />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="truncate text-md font-semibold leading-snug tracking-[-0.01em] text-ink">
              {item.title ?? item.url}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge mono>{item.format.toUpperCase()}</Badge>
              {item.quality && showsQuality(item.format) && <Badge mono>{item.quality}</Badge>}
              {/* Which playlist this one came out of. Without it a running
                  download is just a video title with no account of why it's
                  there — and the folder it lands in wouldn't be obvious. */}
              {item.alreadyExisted && <Badge>Already in folder</Badge>}
              {item.playlist && (
                <Badge tone="accent" className="max-w-[22ch] truncate">
                  {item.playlist.title}
                </Badge>
              )}
            </div>
          </div>
          <DownloadStatus status={item.status} />
        </div>

        {showProgress && <DownloadProgress item={item} />}

        {item.status === "failed" && item.error && (
          // Recessed well, not a tinted slab: this sits *inside* a card, and a
          // filled danger block there reads as a nested container. Same
          // icon-plate vocabulary as ErrorState and the toasts.
          <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-inset p-3.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-danger-soft text-danger-ink">
              <TriangleAlert className="size-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm leading-relaxed text-ink">{item.error}</p>
              {item.errorDetails && (
                <details className="mt-2">
                  <summary className="w-fit cursor-pointer select-none text-xs font-medium text-ink-3 transition-colors hover:text-ink">
                    View details
                  </summary>
                  <pre
                    data-selectable
                    // `card`, not `inset` — the well around it is already inset,
                    // and same-on-same would make the raw output invisible.
                    className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-card p-2.5 font-mono text-2xs leading-relaxed text-ink-2"
                  >
                    {item.errorDetails}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {hasActions && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {isDone && (
              <>
                <Button variant="primary" size="sm" onClick={() => onOpen(item.filePath)}>
                  <Play />
                  Open File
                </Button>
                <Button size="sm" onClick={() => (onReveal ?? onOpen)(item.filePath)}>
                  <FolderOpen />
                  Show in Folder
                </Button>
              </>
            )}
            {canRetry && onRetry && (
              <Button variant="primary" size="sm" onClick={() => onRetry(item.id)}>
                <RotateCcw />
                Retry
              </Button>
            )}
            {showProgress && onCancel && (
              <Button variant="ghost" size="sm" onClick={() => onCancel(item.id)}>
                <X />
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
