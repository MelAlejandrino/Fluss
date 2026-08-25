import { FolderOpen, Play, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { DownloadItem } from "@/types/download";
import { isUnfinished, type PlaylistGroup } from "@/lib/downloadGroups";
import { DownloadCard } from "./DownloadCard";
import { DownloadStatus } from "./DownloadStatus";
import { PlaylistBlock } from "./PlaylistBlock";
import { Thumbnail } from "./Thumbnail";
import { Badge } from "@/components/ui/Badge";
import { showsQuality } from "@/lib/quality";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { staggerContainer, staggerItem, rise } from "@/lib/motion";

interface DownloadQueueProps {
  active: DownloadItem[];
  queuedGroups: PlaylistGroup[];
  finishedGroups: PlaylistGroup[];
  onOpen: (filePath?: string) => void;
  onReveal?: (filePath?: string) => void;
  onCancel?: (id: string) => void;
  onCancelPlaylist?: (playlistId: string) => void;
  onRetry?: (id: string) => void;
  onRetryPlaylist?: (playlistId: string) => void;
  isExpanded: (id: string) => boolean;
  onToggle: (id: string) => void;
}

/**
 * A titled band of the queue. Section headings are sentence-case and sized
 * one step under the page title — they orient, they don't compete.
 */
function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <motion.section variants={rise} initial="hidden" animate="show" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-md font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {meta && <span className="font-mono text-xs tabular-nums text-ink-3">{meta}</span>}
      </div>
      {children}
    </motion.section>
  );
}

/**
 * The row shell every compact list item shares.
 *
 * A playlist item is numbered by its place in the playlist, not its place in
 * this list. Half a playlist showing "1, 2, 3" when it is really videos 7, 8
 * and 9 is worse than no numbers at all — the number is there to tell you which
 * videos you're looking at.
 */
function Row({ item, index, children }: { item: DownloadItem; index: number; children: ReactNode }) {
  return (
    <>
      <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-ink-3">
        {(item.playlistIndex ?? index) + 1}
      </span>
      {children}
    </>
  );
}

/**
 * A waiting item: one compact row. Nothing has happened to it yet, so it says
 * only what it is and offers the one action that applies.
 */
function QueuedRow({
  item,
  index,
  onCancel,
}: {
  item: DownloadItem;
  index: number;
  onCancel?: (id: string) => void;
}) {
  return (
    <div
      data-menu="download"
      data-menu-id={item.id}
      className="flex items-center gap-4 border-t border-line px-4 py-3 transition-colors duration-150 first:border-t-0 hover:bg-hover"
    >
      <Row item={item} index={index}>
        <Thumbnail src={item.thumbnailUrl} className="w-16" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-base font-medium text-ink">{item.title ?? item.url}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge mono>{item.format.toUpperCase()}</Badge>
            {item.quality && showsQuality(item.format) && <Badge mono>{item.quality}</Badge>}
          </div>
        </div>
        <DownloadStatus status={item.status} />
        {onCancel && (
          <IconButton label="Remove from queue" tone="danger" onClick={() => onCancel(item.id)}>
            <X strokeWidth={1.75} />
          </IconButton>
        )}
      </Row>
    </div>
  );
}

/**
 * A settled item inside a playlist. Compact, because the block it sits in can
 * hold thirty of them and a wall of full cards is unreadable.
 *
 * ponytail: the friendly reason is shown, the raw engine output isn't — a
 * "View details" disclosure per row would bury the block. Failures outside a
 * playlist still get the full card treatment.
 */
function FinishedRow({
  item,
  index,
  onOpen,
  onReveal,
  onRetry,
}: {
  item: DownloadItem;
  index: number;
  onOpen: (filePath?: string) => void;
  onReveal?: (filePath?: string) => void;
  onRetry?: (id: string) => void;
}) {
  // A completed download whose file was deleted is not something you can open;
  // the only useful thing left to offer is fetching it again.
  const isDone = item.status === "completed" && !item.fileMissing;

  return (
    <div
      data-menu="download"
      data-menu-id={item.id}
      className="flex items-center gap-4 border-t border-line px-4 py-3 transition-colors duration-150 first:border-t-0 hover:bg-hover"
    >
      <Row item={item} index={index}>
        <Thumbnail src={item.thumbnailUrl} className="w-16" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-base font-medium text-ink">{item.title ?? item.url}</p>
          {item.status === "failed" && item.error ? (
            <p className="truncate text-xs text-danger-ink">{item.error}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge mono>{item.format.toUpperCase()}</Badge>
              {item.quality && showsQuality(item.format) && <Badge mono>{item.quality}</Badge>}
              {item.fileMissing && <Badge tone="warn">File deleted</Badge>}
              {item.alreadyExisted && !item.fileMissing && (
                <Badge>Already in folder</Badge>
              )}
            </div>
          )}
        </div>
        {!item.fileMissing && <DownloadStatus status={item.status} />}
        <div className="flex shrink-0 items-center gap-0.5">
          {isDone && (
            <>
              <IconButton label="Open file" onClick={() => onOpen(item.filePath)}>
                <Play strokeWidth={1.75} />
              </IconButton>
              <IconButton
                label="Show in folder"
                onClick={() => (onReveal ?? onOpen)(item.filePath)}
              >
                <FolderOpen strokeWidth={1.75} />
              </IconButton>
            </>
          )}
          {!isDone && onRetry && (
            <IconButton label="Try again" onClick={() => onRetry(item.id)}>
              <RotateCcw strokeWidth={1.75} />
            </IconButton>
          )}
        </div>
      </Row>
    </div>
  );
}

/**
 * The queue, in three bands: what's running, what's waiting, what's done.
 *
 * Running items get full cards because there's something to read or act on.
 * Everything else is compact rows in a single container — a queue of fifteen
 * identical cards is a wall, and none of them have anything to say yet.
 *
 * A playlist's items are one block with a header of their own, in every band.
 * Thirty rows from one link should read as one thing you queued, and be one
 * thing you can call off or put back — otherwise cancelling means thirty
 * clicks, and so does undoing it.
 */
export function DownloadQueue({
  active,
  queuedGroups,
  finishedGroups,
  onOpen,
  onReveal,
  onCancel,
  onCancelPlaylist,
  onRetry,
  onRetryPlaylist,
  isExpanded,
  onToggle,
}: DownloadQueueProps) {
  const queuedCount = queuedGroups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="flex flex-col gap-10">
      {active.length > 0 && (
        <Section title="Downloading">
          <div className="flex flex-col gap-3">
            {active.map((item) => (
              <DownloadCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onReveal={onReveal}
                onCancel={onCancel}
              />
            ))}
          </div>
        </Section>
      )}

      {queuedCount > 0 && (
        <Section title="Queued" meta={`${queuedCount} item${queuedCount === 1 ? "" : "s"}`}>
          <div className="flex flex-col gap-4">
            {queuedGroups.map((group) => {
              const playlist = group.playlist;
              const rows = group.items.map((item, i) => (
                <QueuedRow key={item.id} item={item} index={i} onCancel={onCancel} />
              ));

              if (!playlist) {
                return (
                  <div
                    key="loose"
                    className="overflow-hidden rounded-xl border border-line bg-card shadow-card"
                  >
                    {rows}
                  </div>
                );
              }

              return (
                <PlaylistBlock
                  key={playlist.id}
                  title={playlist.title}
                  meta={`${group.done} of ${group.total} downloaded`}
                  actions={
                    onCancelPlaylist && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancelPlaylist(playlist.id)}
                      >
                        <X />
                        Cancel all
                      </Button>
                    )
                  }
                >
                  {rows}
                </PlaylistBlock>
              );
            })}
          </div>
        </Section>
      )}

      {finishedGroups.length > 0 && (
        <Section title="Recent">
          <div className="flex flex-col gap-4">
            {finishedGroups.map((group) => {
              const playlist = group.playlist;

              // Loose items keep the full card: there's room to read the whole
              // failure, and no block header would be telling the truth about
              // downloads that have nothing to do with each other.
              if (!playlist) {
                return (
                  <motion.div
                    key="loose"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col gap-3"
                  >
                    {group.items.map((item) => (
                      <motion.div key={item.id} variants={staggerItem}>
                        <DownloadCard
                          item={item}
                          onOpen={onOpen}
                          onReveal={onReveal}
                          onRetry={onRetry}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                );
              }

              // "Remaining", not "unfinished": stopping a playlist marks the
              // videos it never reached as cancelled, and calling those
              // unfinished reads as though each one is sitting half-downloaded.
              // What they have in common is only that they have no file yet.
              const remaining = group.items.filter(isUnfinished).length;

              return (
                <PlaylistBlock
                  key={playlist.id}
                  title={playlist.title}
                  meta={
                    remaining > 0
                      ? `${group.done} of ${group.total} downloaded · ${remaining} to go`
                      : `${group.done} of ${group.total} downloaded`
                  }
                  count={group.items.length}
                  expanded={isExpanded(playlist.id)}
                  onToggle={() => onToggle(playlist.id)}
                  actions={
                    remaining > 0 &&
                    onRetryPlaylist && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onRetryPlaylist(playlist.id)}
                      >
                        <RotateCcw />
                        Resume {remaining}
                      </Button>
                    )
                  }
                >
                  {group.items.map((item, i) => (
                    <FinishedRow
                      key={item.id}
                      item={item}
                      index={i}
                      onOpen={onOpen}
                      onReveal={onReveal}
                      onRetry={onRetry}
                    />
                  ))}
                </PlaylistBlock>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
