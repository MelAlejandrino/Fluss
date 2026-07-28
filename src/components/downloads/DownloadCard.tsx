import { X, FolderOpen, Play, RotateCcw, AlertTriangle } from "lucide-react";
import type { DownloadCardProps } from "@/types/download";
import { DownloadStatus } from "./DownloadStatus";
import { DownloadProgress } from "./DownloadProgress";
import { Thumbnail } from "./Thumbnail";

export function DownloadCard({ item, onOpen, onReveal, onCancel, onRetry }: DownloadCardProps) {
  const showProgress = item.status === "downloading" || item.status === "processing";
  const isDone = item.status === "completed";
  const canRetry = item.status === "failed" || item.status === "cancelled";

  return (
    <div
      data-menu="download"
      data-menu-id={item.id}
      className="flex gap-4 rounded-sm border border-outline-variant bg-surface-container-low p-4 transition-colors hover:border-outline"
    >
      <Thumbnail src={item.thumbnailUrl} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-on-surface">
              {item.title ?? item.url}
            </h3>
            <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
              {item.format}
              {item.quality ? ` · ${item.quality}` : ""}
            </p>
          </div>
          <DownloadStatus status={item.status} />
        </div>

        {showProgress && <DownloadProgress item={item} />}

        {item.status === "failed" && item.error && (
          <div className="flex items-start gap-2 rounded-sm border border-error/40 bg-error/10 p-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-on-surface">{item.error}</p>
              {item.errorDetails && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer select-none font-mono text-[11px] text-on-surface-variant hover:text-on-surface">
                    View details
                  </summary>
                  <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-on-surface-variant">
                    {item.errorDetails}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {(showProgress || isDone || canRetry) && (
          <div className="mt-1 flex gap-2">
            {isDone && (
              <>
                <button
                  onClick={() => onOpen(item.filePath)}
                  className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Play className="size-3.5" strokeWidth={1.5} />
                  Open File
                </button>
                <button
                  onClick={() => (onReveal ?? onOpen)(item.filePath)}
                  className="inline-flex items-center gap-1.5 rounded border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface hover:border-outline"
                >
                  <FolderOpen className="size-3.5" strokeWidth={1.5} />
                  Show in Folder
                </button>
              </>
            )}
            {canRetry && onRetry && (
              <button
                onClick={() => onRetry(item.id)}
                className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary/90 active:scale-[0.98]"
              >
                <RotateCcw className="size-3.5" strokeWidth={1.5} />
                Retry
              </button>
            )}
            {showProgress && onCancel && (
              <button
                onClick={() => onCancel(item.id)}
                className="inline-flex items-center gap-1.5 rounded border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface hover:border-outline"
              >
                <X className="size-3.5" strokeWidth={1.5} />
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
