import { Clock3, Play, FolderOpen, RotateCcw, X, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { showsQuality } from "@/lib/quality";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DownloadStatus } from "@/components/downloads/DownloadStatus";
import { PlaylistBlock } from "@/components/downloads/PlaylistBlock";
import { Thumbnail } from "@/components/downloads/Thumbnail";
import { useHistory } from "@/hooks/useHistory";
import { useHistoryFilter, type HistoryFilter } from "@/hooks/useHistoryFilter";
import { useExpanded } from "@/hooks/useExpanded";
import { formatDate } from "@/lib/formatters";
import type { DownloadHistoryItem } from "@/types/download";
import type { HistoryGroup } from "@/lib/historyGroups";
import { hasFile } from "@/lib/downloadGroups";

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

/** One past download. Identical whether it stands alone or sits in a playlist. */
function HistoryRow({
  item,
  onOpen,
  onShowInFolder,
  onRetry,
  onRemove,
}: {
  item: DownloadHistoryItem;
  onOpen: (filePath?: string) => void;
  onShowInFolder: (filePath?: string) => void;
  onRetry: (item: DownloadHistoryItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      data-menu="history"
      data-menu-id={item.id}
      className="flex items-center gap-4 border-t border-line px-4 py-3 transition-colors duration-150 first:border-t-0 hover:bg-hover"
    >
      <Thumbnail src={item.thumbnailUrl} className="w-16" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-base font-medium text-ink">{item.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge mono>{item.format.toUpperCase()}</Badge>
          {item.quality && showsQuality(item.format) && <Badge mono>{item.quality}</Badge>}
          <span className="text-xs text-ink-3">
            {formatDate(item.completedAt ?? item.createdAt)}
          </span>
          {item.fileMissing && <Badge tone="warn">File deleted</Badge>}
        </div>
      </div>

      {!item.fileMissing && <DownloadStatus status={item.status} />}

      <div className="flex shrink-0 items-center gap-0.5">
        {item.status === "completed" && !item.fileMissing && (
          <>
            <IconButton label="Open file" onClick={() => onOpen(item.filePath)}>
              <Play strokeWidth={1.75} />
            </IconButton>
            <IconButton label="Show in folder" onClick={() => onShowInFolder(item.filePath)}>
              <FolderOpen strokeWidth={1.75} />
            </IconButton>
          </>
        )}
        <IconButton label="Download again" onClick={() => onRetry(item)}>
          <RotateCcw strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Remove from history" tone="danger" onClick={() => onRemove(item.id)}>
          <X strokeWidth={1.75} />
        </IconButton>
      </div>
    </div>
  );
}

export function HistoryPage() {
  const { isLoading, history, open, showInFolder, retry, retryGroup, remove, removeGroup } =
    useHistory();
  const { query, setQuery, filter, setFilter, groups, isFiltered } = useHistoryFilter(history);
  const { isExpanded, toggle } = useExpanded();
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
      ) : groups.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing matches"
          description={
            isFiltered ? "Try a different search, or switch the filter back to All." : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group: HistoryGroup) => {
            const rows = group.items.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                onOpen={open}
                onShowInFolder={showInFolder}
                onRetry={retry}
                onRemove={remove}
              />
            ));

            if (!group.playlist) {
              return (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-line bg-card shadow-card"
                >
                  {rows}
                </div>
              );
            }

            // Any completed file identifies the playlist's folder, which is
            // where "Show in folder" should land — the whole point of giving a
            // playlist its own folder is being able to open it as one.
            const anyFile = group.items.find(hasFile)?.filePath;

            return (
              <PlaylistBlock
                key={group.key}
                title={group.playlist.title}
                meta={
                  group.unfinished > 0
                    ? `${group.completed} of ${group.total} downloaded · ${group.unfinished} to go · ${formatDate(group.at)}`
                    : `${group.completed} downloaded · ${formatDate(group.at)}`
                }
                count={group.items.length}
                expanded={isExpanded(group.key)}
                onToggle={() => toggle(group.key)}
                actions={
                  <div className="flex shrink-0 items-center gap-0.5">
                    {group.unfinished > 0 ? (
                      <Button variant="primary" size="sm" onClick={() => retryGroup(group)}>
                        <RotateCcw />
                        Resume {group.unfinished}
                      </Button>
                    ) : (
                      <IconButton label="Download playlist again" onClick={() => retryGroup(group)}>
                        <RotateCcw strokeWidth={1.75} />
                      </IconButton>
                    )}
                    {anyFile && (
                      <IconButton label="Show playlist folder" onClick={() => showInFolder(anyFile)}>
                        <FolderOpen strokeWidth={1.75} />
                      </IconButton>
                    )}
                    <IconButton
                      label="Remove playlist from history"
                      tone="danger"
                      onClick={() => removeGroup(group)}
                    >
                      <X strokeWidth={1.75} />
                    </IconButton>
                  </div>
                }
              >
                {rows}
              </PlaylistBlock>
            );
          })}
        </div>
      )}
    </div>
  );
}
