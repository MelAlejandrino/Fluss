import { Clock3, Play, FolderOpen, RotateCcw, X, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DownloadStatus } from "@/components/downloads/DownloadStatus";
import { Thumbnail } from "@/components/downloads/Thumbnail";
import { useHistory } from "@/hooks/useHistory";
import { useHistoryFilter, type HistoryFilter } from "@/hooks/useHistoryFilter";
import { formatDate } from "@/lib/formatters";
import type { DownloadHistoryItem } from "@/types/download";

/**
 * Rows the same height as the real ones, so the list doesn't jump when the
 * history arrives from disk (PLAN §55).
 */
function LoadingRows() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-card"
      aria-busy="true"
      aria-label="Loading history"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 border-t border-line px-4 py-3 first:border-t-0">
          <Skeleton className="aspect-video w-16 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded-sm" />
            <Skeleton className="h-3 w-1/4 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryPage() {
  const { history, isLoading, open, showInFolder, retry, remove } = useHistory();
  const { query, setQuery, filter, setFilter, filtered, isFiltered } = useHistoryFilter(history);
  const hasHistory = history.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-10 py-12 max-lg:px-7">
      <PageHeader
        title="History"
        description="Everything Fluss has downloaded, kept on this machine only."
      />

      {/* The toolbar only earns its space once there's something to sift. */}
      {!isLoading && hasHistory && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or link…"
            aria-label="Search history"
            icon={<Search strokeWidth={1.75} />}
            wrapperClassName="min-w-64 flex-1"
          />
          <SegmentedControl<HistoryFilter>
            name="history-filter"
            label="Filter by outcome"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "completed", label: "Completed" },
              { value: "failed", label: "Unfinished" },
            ]}
          />
        </div>
      )}

      {isLoading ? (
        <LoadingRows />
      ) : !hasHistory ? (
        <EmptyState
          icon={Clock3}
          title="No history yet"
          description="Finished downloads collect here so you can reopen a file or fetch it again later."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing matches"
          description={
            isFiltered
              ? "Try a different search, or switch the filter back to All."
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
          {filtered.map((item: DownloadHistoryItem) => (
            <div
              key={item.id}
              data-menu="history"
              data-menu-id={item.id}
              className="flex items-center gap-4 border-t border-line px-4 py-3 transition-colors duration-150 first:border-t-0 hover:bg-hover"
            >
              <Thumbnail src={item.thumbnailUrl} className="w-16" />

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="truncate text-base font-medium text-ink">{item.title}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge mono>{item.format.toUpperCase()}</Badge>
                  {item.quality && <Badge mono>{item.quality}</Badge>}
                  <span className="text-xs text-ink-3">
                    {formatDate(item.completedAt ?? item.createdAt)}
                  </span>
                </div>
              </div>

              <DownloadStatus status={item.status} />

              <div className="flex shrink-0 items-center gap-0.5">
                {item.status === "completed" && (
                  <>
                    <IconButton label="Open file" onClick={() => open(item.filePath)}>
                      <Play strokeWidth={1.75} />
                    </IconButton>
                    <IconButton
                      label="Show in folder"
                      onClick={() => showInFolder(item.filePath)}
                    >
                      <FolderOpen strokeWidth={1.75} />
                    </IconButton>
                  </>
                )}
                <IconButton label="Download again" onClick={() => retry(item)}>
                  <RotateCcw strokeWidth={1.75} />
                </IconButton>
                <IconButton
                  label="Remove from history"
                  tone="danger"
                  onClick={() => remove(item.id)}
                >
                  <X strokeWidth={1.75} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
